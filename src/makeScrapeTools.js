const { zip, fromPairs } = require("lodash")
const { wrapPage, newBrowserPage, evalX } = require("./util")

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
 *   fetchPdfData(*=): Promise<*[]>,
 *   getPageCookies(*=): Promise<*[]>,
 *   getPageDataFetcher(analystName: string): PageDataFetcher,
 * }}
 */

class PageDataFetcher {
  /**
   * @param analystName
   * @param ticker
   * @param browser
   * @param existingPage
   */
  constructor(analystName, ticker, browser, existingPage) {
    this.analystName = analystName
    this.ticker = ticker
    this.browser = browser

    this.page = existingPage
    this.originPage = null
  }

  newPage(url, options) {
    return newBrowserPage(this.browser, url, options)
  }

  async setPage(url, options) {
    if (url) {
      this.page = await this.newPage(url, { waitUntil: "domcontentloaded", ...options })
    }
  }

  async setPageTrPopup() {
    this.originPage = await this.newPage(
      `https://invest.ameritrade.com/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/analystreports?symbol=${this.ticker}&c_name=invest_VENDOR`,
      { waitUntil: "networkidle0" }
    )

    const frameMain = await this.originPage
      .frames()
      .find(frame => frame.name() === "main")

    const analystReportsFrame = frameMain
      .childFrames()
      .find(frame => frame.name() === "tdaxModuleAnalystReportsHighchartsIframe")

    const hasButton = await analystReportsFrame.$(`div.highcharts-footer > button`)
    if (hasButton) {
      await analystReportsFrame.click(`div.highcharts-footer > button`).catch(() => {
        console.log(
          `analystReportsFrame.click failed for setPageTrPopup -> ticker: ${this.ticker} -> analyst ${this.analystName}`
        )
      })
      this.page = await new Promise(res =>
        this.browser.once("targetcreated", target => res(target.page()))
      )

      if (!this.page) {
        console.error(
          `PageDataFecther.setPageTrPopup TARGET NOT FOUND -> ticker: ${this.ticker} -> analyst: ${this.analystName}`
        )
        return false
      }

      wrapPage(this.page)
      return true
    } else {
      console.error(
        `PageDataFetcher.setPageTrPopup (404) -> ticker: ${this.ticker} -> analyst:${this.analystName}`
      )
      return false
    }
  }

  async fetchPageData(xPathArr, waitForXpath) {
    const { analystName, page, ticker } = this

    if (!page) {
      console.error(
        `PageDataFetcher.fetchPageData (404) -> ticker: ${ticker} -> analyst:${analystName}`
      )
      return []
    }

    const waitFor = waitForXpath || xPathArr[0]
    try {
      await page.waitForXPath(waitFor, { timeout: XPATH_TIMEOUT })
    } catch (err) {
      if (err.message.includes("is not a valid XPath expression")) {
        console.log("*** invalid xpath: " + waitFor)
      } else {
        console.log(
          `fetchPageData waitForXpath failed for xpath: ${waitFor} -> ticker ${ticker} -> analyst: ${analystName}`
        )
      }
      return []
    }

    const values = await Promise.all(xPathArr.map(page.getTextByX))
    console.log(`${this.ticker} - ${analystName} Page: done`)
    return values
  }

  async fetchFidelityReportData(fidelityReportNameArr) {
    const { page } = this
    if (!page) {
      console.error(
        `PageDataFetcher.fetchFidelityReportData (404) -> ticker: ${this.ticker}`
      )
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
   * @returns {Promise}
   */
  click(selector) {
    const { page, ticker, analystName } = this

    if (!page) {
      return Promise.resolve()
    }

    return page.click(selector).catch(() => {
      console.log(
        `page click failed for selector: ${selector} -> ticker: ${ticker} -> analyst ${analystName}`
      )
    })
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
    const { page, originPage } = this
    if (originPage && !originPage.isClosed()) {
      await originPage.closeSafe()
    }
    if (page && !page.isClosed()) {
      await page.closeSafe()
    }
  }
}

/**
 * @param ticker
 * @param browser
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
     * @typedef GetPageCookies
     * @param url
     * @returns {Promise<string>}
     */
    async getPageCookies(url) {
      const page = await newPage(url)
      const cookieArr = await page.cookies()
      await page.closeSafe()
      return cookieArr.map(({ name, value }) => `${name}=${value}`).join("; ")
    },

    getPageDataFetcher(analystName) {
      return new PageDataFetcher(analystName, ticker, browser)
    },
  }
}
