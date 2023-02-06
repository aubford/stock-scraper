const Logger = require("./Logger")
const { goToNewBrowserPage } = require("./puppeteer")

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @param {string} options.url
 * @param {string} options.analystName
 * @param {string[]} options.xPathArr
 * @param {string[]} [options.waitForPostScroll]
 * @param {Number} [options.timeout]
 * @returns {Promise<*[]>}
 */
const fetchPdfData = async ({
  ticker,
  browser,
  url,
  analystName,
  xPathArr,
  waitForPostScroll,
  timeout = XPATH_TIMEOUT,
}) => {
  const logger = new Logger(ticker, analystName + " fetchPdfData")
  if (!url) {
    logger.warn(`fetchPdfData: NO REPORT`)
    return []
  }

  /** @type MyPage */
  const page = await goToNewBrowserPage(browser, url, { waitUntil: "networkidle2", logger })
  if (page.error) {
    await page.closeSafe()
    return []
  }

  const dataNotAvailableText = await page.$x(
    `//body[contains(text(),'data is not available to create this report')]`
  )
  if (dataNotAvailableText.length > 0) {
    logger.error("fetchPdfData: Data not available text found in PDF")
    await page.closeSafe()
    return []
  }

  try {
    await page.waitForXPath(xPathArr[0], { timeout })
  } catch (err) {
    logger.error(
      `fetchPdfData: waitForXpath timed out -> xpath: ${xPathArr[0]} <=> url: ${url}`
    )
    await page.closeSafe()
    return []
  }

  if (waitForPostScroll) {
    const [viewerContainer] = await page.$x(`//div[@id='viewerContainer']`)
    await viewerContainer.evaluate(node => node.scrollBy(0, 2000))
    try {
      await page.waitForXPath(waitForPostScroll, { timeout })
    } catch (err) {
      logger.error(
        `fetchPdfData: waitForXpath after scroll timed out -> xpath: ${waitForPostScroll} <=> url: ${url}`
      )
    }
  }

  const values = await Promise.all(xPathArr.map(page.getTextByX))

  await page.closeSafe()
  logger.completeOk("PDF: Done")
  return values
}

module.exports = fetchPdfData
