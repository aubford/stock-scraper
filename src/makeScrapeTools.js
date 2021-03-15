const { zip, fromPairs } = require("lodash")
const { newBrowserPage, evalX } = require("./util")

/**
 * @typedef ScrapeTools
 * @property {PageDataFetcher} PageDataFetcher
 * @property {getPageCookies} getPageCookies
 * @property {fetchPdfData} fetchPdfData
 */

/**
 * @param {string} ticker
 * @param {*} browser
 * @returns {ScrapeTools}
 */
module.exports = (ticker, browser) => {
  const newPage = (url, options) => newBrowserPage(browser, url, options)

  class PageDataFetcher {
    constructor(analystName, existingPage) {
      this.analystName = analystName
      this.page = existingPage
    }

    async setPage(url) {
      if (url) {
        this.page = await newPage(url, { waitUntil: "domcontentloaded" })
      }
    }

    async fetchPageData(xPathArr, waitForXpath) {
      const { analystName, page } = this

      if (!page) {
        console.error(
          `*fetchPageData failed (no url) -> ticker: ${ticker} -> analyst:${analystName}`
        )
        return []
      }

      const waitFor = waitForXpath || xPathArr[0]
      try {
        await page.waitForXPath(waitFor, { timeout: XPATH_TIMEOUT })
      } catch (err) {
        console.log("fetchPageData waitForXpath failed for url: " + waitFor)
        return []
      }

      const values = await Promise.all(xPathArr.map(page.getTextByX))
      console.log(`${ticker} - ${analystName} Page: done`)
      return values
    }

    async fetchFidelityReportData(fidelityReportNameArr) {
      const { page } = this
      if (!page) {
        console.error(`*fetchFidelityReportData failed for ticker: ${ticker}`)
        return []
      }
      /** @type {array} */
      const reportHrefsHandles = await page.$x(
        `//table[@id="allOpinionsTable"]/tbody/tr/td[9]`
      )

      const reportLinks = await Promise.all(
        reportHrefsHandles.map(handle =>
          evalX(handle, "a", node => {
            const href = node.href
            const text = node.textContent

            if (href === "javascript:void(0);") {
              return { text, href: node.getAttribute("onclick").split(`'`)[1] }
            }

            return { text, href }
          })
        )
      )

      const {
        [ARGUS_ANALYST_KEY]: { href: argusAnalystLink, text: argusAnalystDate } = {},
        [ARGUS_RESEARCH_KEY]: { href: argusResearchLink, text: argusResearchDate } = {},
        [ZACKS_KEY]: { href: zacksLink, text: zacksDate } = {},
      } = fromPairs(zip(fidelityReportNameArr, reportLinks))

      return {
        argusAnalystDate,
        argusAnalystLink,
        argusResearchDate,
        argusResearchLink,
        zacksDate,
        zacksLink,
      }
    }

    /**
     * @param selector
     * @returns {Promise<string|string[]>}
     */
    async fetchHref(selector) {
      const { page } = this
      if (page) {
        return await evalX(page, selector, node => node.href)
      }
    }

    /**
     * @param {String} selector
     * @param {String} attribute
     * @returns {Promise<string|string[]>}
     */
    async fetchAttribute(selector, attribute) {
      const { page } = this
      if (page) {
        return await evalX(
          page,
          selector,
          (node, attr) => node.getAttribute(attr),
          attribute
        )
      }
    }

    async close() {
      const { page } = this
      if (page && !page.isClosed()) {
        await page.closeSafe()
      }
    }
  }

  return {
    /**
     * @typedef fetchPdfData
     * @param {Object} options
     * @param {String} options.url
     * @param {String} options.analystName
     * @param {String[]} options.xPathArr
     * @param {String[]} [options.waitForPostScroll]
     * @param {Number} [options.timeout]
     * @returns {Promise<*[]>}
     */
    async fetchPdfData({
      url,
      analystName,
      xPathArr,
      waitForPostScroll,
      timeout = XPATH_TIMEOUT,
    }) {
      if (!url) {
        console.log(`no report -> ticker: ${ticker} -> analyst:${analystName}`)
        return []
      }

      /** @type MyPage */
      const page = await newPage(url, { waitUntil: "networkidle2" })
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
        console.error(
          `waitForXpath failed -> ticker: ${ticker} -> analyst:${analystName} -> url: ${url}`
        )
        await page.closeSafe()
        return []
      }

      if (waitForPostScroll) {
        const [viewerContainer] = await page.$x(`//div[@id='viewerContainer']`)
        await viewerContainer.evaluate(node => node.scrollBy(0, 2000))
        try {
          await page.waitForXPath(waitForPostScroll, { timeout: XPATH_TIMEOUT })
        } catch (err) {
          console.error(
            `waitForXpath after scroll failed -> ticker: ${ticker} -> analyst:${analystName} -> url: ${url}`
          )
        }
      }

      const values = await Promise.all(xPathArr.map(page.getTextByX))

      await page.closeSafe()
      console.log(`${ticker} - ${analystName} PDF: done`)
      return values
    },

    /**
     * @typedef getPageCookies
     * @param url
     * @returns {Promise<string>}
     */
    async getPageCookies(url) {
      const page = await newPage(url)
      const cookieArr = await page.cookies()
      await page.closeSafe()
      return cookieArr.map(({ name, value }) => `${name}=${value}`).join("; ")
    },
    PageDataFetcher,
  }
}
