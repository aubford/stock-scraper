const Logger = require("../Logger")
const { goToNewBrowserPage } = require("../puppeteer-utils")
const { MessageError, ReError } = require("../util")

const handlePage = async (page, { url, xPathArr, waitForPostScroll, timeout }) => {
  if (page.error) {
    throw new MessageError("goToNewBrowserPage returned truthy page.error")
  }

  const dataNotAvailableText = await page.$x(
    `//body[contains(text(),'data is not available to create this report')]`
  )
  if (dataNotAvailableText.length > 0) {
    throw new MessageError(`Data not available text found in PDF`).setCode(404)
  }

  await page.waitForXPath(xPathArr[0], { timeout }).catch(err => {
    throw new ReError(`waitForXpath timed out -> xpath: ${xPathArr[0]} <=> url: ${url}`, err)
  })

  if (waitForPostScroll) {
    const [viewerContainer] = await page.$x(`//div[@id='viewerContainer']`)
    await viewerContainer.evaluate(node => node.scrollBy(0, 2000))
    await page.waitForXPath(waitForPostScroll, { timeout }).catch(err => {
      throw new ReError(
        `waitForXpath after scroll timed out -> xpath: ${waitForPostScroll} <=> url: ${url}`,
        err
      )
    })
  }

  return await Promise.all(xPathArr.map(page.getTextByX))
}

/**
 * @param {object} logger
 * @param {object} options
 * @param {object}    options.browser
 * @param {string}    options.url
 * @param {string[]}  options.xPathArr
 * @param {string[]}  options.waitForPostScroll
 * @param {Number}    options.timeout
 * @returns {Promise<*[]>}
 */
const fetchPdfData = async (
  logger,
  { browser, url, xPathArr, waitForPostScroll, timeout = XPATH_TIMEOUT }
) => {
  if (!url) {
    throw new MessageError(`fetchPdfData: NO REPORT`).setCode(404)
  }

  /** @type MyPage */
  const page = await goToNewBrowserPage(browser, url, {
    waitUntil: "networkidle2",
    logger,
  }).catch(err => {
    throw new ReError("goToNewBrowserPage failed", err, "fetchPdfData").setCode(true)
  })

  const values = await handlePage(page, {
    url,
    xPathArr,
    waitForPostScroll,
    timeout,
  }).catch(err => {
    page.closeSafe()
    if (err.code) {
      throw err
    }
    throw new ReError("handlePage failed", err, "fetchPdfData").setCode(true)
  })

  await page.closeSafe()
  logger.completeOk("PDF: Done")
  return values
}

module.exports = options => {
  const logger = new Logger(options.ticker, options.analystName + " PDF")
  return fetchPdfData(logger, options).catch(err => {
    if (err.code) {
      throw err
    }
    throw new ReError("fetch error!", err, "fetchPdfData")
  })
}
