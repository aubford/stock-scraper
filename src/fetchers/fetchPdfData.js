const { goToNewBrowserPage } = require("../util/puppeteer-utils")
const { WarnError, ReError, MessageError } = require("../util")

const handlePage = async (page, { url, xPathArr, waitForPostScroll, timeout, extract }) => {
  if (page.error) {
    throw new MessageError("goToNewBrowserPage returned truthy page.error", "fetchPdfData")
  }

  const dataNotAvailableText = await page.$x(
    `//body[contains(text(),'data is not available to create this report')]`
  )
  if (dataNotAvailableText.length > 0) {
    throw new WarnError(`Data not available text found in PDF`, "fetchPdfData")
  }

  await page.waitForXPath(xPathArr[0], { timeout }).catch(err => {
    throw new ReError(
      `waitForXpath timed out -> xpath: ${xPathArr[0]} <=> url: ${url}`,
      err,
      "handlePage"
    ).setCode(400)
  })

  if (waitForPostScroll) {
    const [viewerContainer] = await page.$x(`//div[@id='viewerContainer']`)
    await viewerContainer.evaluate(node => node.scrollBy(0, 2000))
    await page.waitForXPath(waitForPostScroll, { timeout }).catch(err => {
      throw new ReError(
        `waitForXpath after scroll timed out -> xpath: ${waitForPostScroll} <=> url: ${url}`,
        err,
        "handlePage"
      ).setCode(400)
    })
  }

  if (extract) {
    return await extract(page)
  }

  return await Promise.all(xPathArr.map(page.getTextByX))
}

const FETCH_PDF_DEADLINE_MS = 60 * 1000
const DEADLINE_CODE = "PDF_DEADLINE"

const attemptFetchPdf = async ({ browser, url, xPathArr, waitForPostScroll, timeout, extract }) => {
  // page is captured in outer scope so the deadline race can close it on timeout
  const pageRef = { current: null }

  const work = (async () => {
    /** @type MyPage */
    const page = await goToNewBrowserPage(browser, url, {
      waitUntil: "networkidle2",
    }).catch(err => {
      throw new ReError("goToNewBrowserPage failed", err, "fetchPdfData").setCode(true)
    })
    pageRef.current = page

    return await handlePage(page, { url, xPathArr, waitForPostScroll, timeout, extract }).catch(err => {
      if (err.code) throw err
      throw new ReError("handlePage failed", err, "fetchPdfData").setCode(true)
    })
  })()

  // Prevent unhandled rejection if the deadline wins the race
  work.catch(() => {})

  let deadlineTimer
  const deadline = new Promise((_, reject) => {
    deadlineTimer = setTimeout(() => {
      reject(
        new MessageError(
          `fetchPdfData deadline ${FETCH_PDF_DEADLINE_MS}ms exceeded for ${url}`,
          "fetchPdfData"
        ).setCode(DEADLINE_CODE)
      )
    }, FETCH_PDF_DEADLINE_MS)
  })

  try {
    return await Promise.race([work, deadline])
  } finally {
    clearTimeout(deadlineTimer)
    if (pageRef.current) await pageRef.current.closeSafe()
  }
}

/**
 * @param {object}    options
 * @param {Browser}   options.browser
 * @param {string}    options.url
 * @param {string[]}  options.xPathArr
 * @param {string[]}  [options.waitForPostScroll]
 * @param {Number}    options.timeout
 * @param {(page: MyPage) => Promise<*>} [options.extract]
 * @returns {Promise<*>}
 */
const fetchPdfData = async opts => {
  if (!opts.url) {
    throw new WarnError(`NO REPORT`, "fetchPdfData")
  }

  const optsWithTimeout = { ...opts, timeout: opts.timeout || XPATH_TIMEOUT }

  try {
    return await attemptFetchPdf(optsWithTimeout)
  } catch (err) {
    if (err && err.code === DEADLINE_CODE) {
      console.log(`fetchPdfData: hit ${FETCH_PDF_DEADLINE_MS}ms deadline, retrying once -> ${opts.url}`)
      return await attemptFetchPdf(optsWithTimeout)
    }
    throw err
  }
}

module.exports = fetchPdfData
