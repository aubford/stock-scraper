const { newBrowserPage } = require("./util")
const PageDataFetcher = require("./PageDataFetcher")
const Logger = require("./Logger")

/**
 * @typedef {function} FetchPdfData
 * @param {Object} options
 * @param {string} options.url
 * @param {string} options.analystName
 * @param {string[]} options.xPathArr
 * @param {string[]} [options.waitForPostScroll]
 * @param {Number} [options.timeout]
 * @returns {Promise<*[]>}
 */

/**
 * @name ScrapeTools
 * @typedef {{
 *   fetchPdfData(*): Promise<*[]>,
 *   getPageCookies(*): Promise<*[]>,
 *   getPageDataFetcher(analystName: string, options: Object): PageDataFetcher,
 * }}
 */

/**
 * @param {string} ticker
 * @param {*} browser
 * @returns {ScrapeTools}
 */
module.exports = (ticker, browser) => {
  const newPage = (url, options) => newBrowserPage(browser, url, options)

  return {
    async fetchPdfData({
      url,
      analystName,
      xPathArr,
      waitForPostScroll,
      timeout = XPATH_TIMEOUT,
    }) {
      const logger = new Logger(ticker, analystName)
      if (!url) {
        logger.warn(`NO REPORT`)
        return []
      }

      /** @type MyPage */
      const page = await newPage(url, { waitUntil: "networkidle2", logger })
      if (page.error) {
        await page.closeSafe()
        return []
      }

      const dataNotAvailableText = await page.$x(
        `//body[contains(text(),'data is not available to create this report')]`
      )
      if (dataNotAvailableText.length > 0) {
        await page.closeSafe()
        return []
      }

      try {
        await page.waitForXPath(xPathArr[0], { timeout })
      } catch (err) {
        logger.error(`waitForXpath timed out -> url: ${url}`)
        await page.closeSafe()
        return []
      }

      if (waitForPostScroll) {
        const [viewerContainer] = await page.$x(`//div[@id='viewerContainer']`)
        await viewerContainer.evaluate(node => node.scrollBy(0, 2000))
        try {
          await page.waitForXPath(waitForPostScroll, { timeout })
        } catch (err) {
          logger.error(`waitForXpath after scroll timed out -> url: ${url}`)
        }
      }

      const values = await Promise.all(xPathArr.map(page.getTextByX))

      await page.closeSafe()
      logger.completeOk("PDF: Done")
      return values
    },

    /**
     * @param {String} url
     * @returns {Promise<*>}
     */
    async getPageCookies(url) {
      const page = await newPage(url)
      const cookieArr = await page.cookies()
      await page.closeSafe()
      return cookieArr.map(({ name, value }) => `${name}=${value}`).join("; ")
    },

    /**
     * @param {string} analystName
     * @param {{timeout:string}} options
     * @returns {PageDataFetcher}
     */
    getPageDataFetcher(analystName, options) {
      return new PageDataFetcher(analystName, ticker, browser, options)
    },
  }
}
