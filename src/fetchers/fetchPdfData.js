const { PDFParse } = require("pdf-parse")
const { newPage } = require("../util/puppeteer-utils")
const { WarnError, ReError, MessageError } = require("../util")

const FETCH_PDF_DEADLINE_MS = 60 * 1000
const DEADLINE_CODE = "PDF_DEADLINE"

/**
 * Navigate to a Merrill PdfLoader URL in a background tab and capture the PDF
 * bytes via CDP Fetch (no PDF Viewer extension / no focus steal).
 * @param {import('puppeteer-core').Browser} browser
 * @param {string} url
 * @param {number} timeout
 * @returns {Promise<Buffer>}
 */
const downloadPdfBuffer = async (browser, url, timeout) => {
  const page = await newPage(browser, { background: true })
  const cdp = await page.target().createCDPSession()
  /** @type {Buffer | null} */
  let pdfBuf = null
  /** @type {Error | null} */
  let fetchError = null
  /** @type {(buf: Buffer) => void} */
  let resolvePdf = () => {}
  /** @type {(err: Error) => void} */
  let rejectPdf = () => {}
  const pdfReady = new Promise((resolve, reject) => {
    resolvePdf = resolve
    rejectPdf = reject
  })

  const onPaused = async event => {
    const { requestId, responseStatusCode } = event
    try {
      if (!pdfBuf && !fetchError && responseStatusCode >= 200 && responseStatusCode < 300) {
        const { body, base64Encoded } = await cdp.send("Fetch.getResponseBody", {
          requestId,
        })
        const buf = Buffer.from(body, base64Encoded ? "base64" : "utf8")
        if (buf.slice(0, 4).toString() === "%PDF") {
          pdfBuf = buf
          resolvePdf(buf)
        } else if (
          /data is not available to create this report/i.test(buf.toString("utf8", 0, 300))
        ) {
          fetchError = new WarnError(`Data not available text found in PDF`, "fetchPdfData")
          rejectPdf(fetchError)
        }
      }
    } catch (_) {
      // Body may already be drained; ignore and continue the request.
    }
    await cdp.send("Fetch.continueRequest", { requestId }).catch(() => {})
  }

  try {
    await cdp.send("Fetch.enable", {
      patterns: [
        { urlPattern: "*PdfLoader*", requestStage: "Response" },
        { urlPattern: "*GetPdfFile*", requestStage: "Response" },
        { urlPattern: "*.pdf*", requestStage: "Response" },
      ],
    })
    cdp.on("Fetch.requestPaused", onPaused)

    const goto = page.goto(url, { waitUntil: "networkidle2", timeout }).catch(err => {
      throw new ReError("PDF page load failed", err, "fetchPdfData").setCode(true)
    })

    await Promise.all([
      goto.catch(() => {}),
      Promise.race([
        pdfReady,
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new MessageError(
                  `No PDF response captured for ${url}`,
                  "fetchPdfData",
                ).setCode(400),
              ),
            timeout,
          ),
        ),
      ]),
    ])

    if (!pdfBuf) {
      throw new MessageError(`No PDF response captured for ${url}`, "fetchPdfData").setCode(400)
    }
    return pdfBuf
  } finally {
    await cdp.send("Fetch.disable").catch(() => {})
    await cdp.detach().catch(() => {})
    await page.closeSafe()
  }
}

/**
 * @param {Buffer} pdfBuf
 * @returns {Promise<string>}
 */
const pdfBufferToText = async pdfBuf => {
  const parser = new PDFParse({ data: pdfBuf })
  try {
    const { text } = await parser.getText()
    return text || ""
  } finally {
    await parser.destroy().catch(() => {})
  }
}

/**
 * @param {object} options
 * @param {import('puppeteer-core').Browser} options.browser
 * @param {string} options.url
 * @param {number} [options.timeout]
 * @param {(text: string) => Promise<*> | *} [options.extract]
 * @returns {Promise<*>}
 */
const attemptFetchPdf = async ({ browser, url, timeout, extract }) => {
  const pdfBuf = await downloadPdfBuffer(browser, url, timeout || XPATH_TIMEOUT)
  const text = await pdfBufferToText(pdfBuf)

  if (/data is not available to create this report/i.test(text)) {
    throw new WarnError(`Data not available text found in PDF`, "fetchPdfData")
  }

  if (extract) {
    return await extract(text)
  }
  return text
}

/**
 * Download a Merrill/Fidelity PDF in a background tab and parse its text.
 * Callers pass `extract(text)` instead of scraping a pdf.js DOM.
 * @param {object}    options
 * @param {Browser}   options.browser
 * @param {string}    options.url
 * @param {Number}    [options.timeout]
 * @param {(text: string) => Promise<*> | *} [options.extract]
 * @returns {Promise<*>}
 */
const fetchPdfData = async opts => {
  if (!opts.url) {
    throw new WarnError(`NO REPORT`, "fetchPdfData")
  }

  const optsWithTimeout = { ...opts, timeout: opts.timeout || XPATH_TIMEOUT }

  const run = () => attemptFetchPdf(optsWithTimeout)

  try {
    const work = run()
    work.catch(() => {})
    let deadlineTimer
    const deadline = new Promise((_, reject) => {
      deadlineTimer = setTimeout(() => {
        reject(
          new MessageError(
            `fetchPdfData deadline ${FETCH_PDF_DEADLINE_MS}ms exceeded for ${opts.url}`,
            "fetchPdfData",
          ).setCode(DEADLINE_CODE),
        )
      }, FETCH_PDF_DEADLINE_MS)
    })
    try {
      return await Promise.race([work, deadline])
    } finally {
      clearTimeout(deadlineTimer)
    }
  } catch (err) {
    if (err && err.code === DEADLINE_CODE) {
      console.log(
        `fetchPdfData: hit ${FETCH_PDF_DEADLINE_MS}ms deadline, retrying once -> ${opts.url}`,
      )
      return await run()
    }
    throw err
  }
}

module.exports = fetchPdfData
