const { zip, fromPairs } = require("lodash")
const { wrapPage, pause, newBrowserPage, evalX } = require("./util")

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
 *   getPageDataFetcher(analystName: string, options: Object): PageDataFetcher,
 * }}
 */

class PageDataFetcher {
  /**
   * @param {string} analystName
   * @param {string} ticker
   * @param {*} browser
   * @param {number} timeout
   */
  constructor(analystName, ticker, browser, { timeout } = {}) {
    this.analystName = analystName
    this.ticker = ticker
    this.browser = browser
    this.timeout = timeout || XPATH_TIMEOUT

    this.page = null
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

    const getMainFrame = async () => {
      const frameMain = this.originPage.frames().find(frame => frame.name() === "main")
      if (!frameMain) {
        console.error("****** FRAME MAIN NOT FOUND ISSUE ******")
        await pause(3500)
        return this.originPage.frames().find(frame => frame.name() === "main")
      } else {
        return frameMain
      }
    }

    const mainFrame = await getMainFrame()

    const analystReportsFrame = mainFrame
      .childFrames()
      .find(frame => frame.name() === "tdaxModuleAnalystReportsHighchartsIframe")

    const hasButton =
      analystReportsFrame &&
      (await analystReportsFrame.$(`div.highcharts-footer > button`))

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
        `PageDataFetcher.setPageTrPopup (TIPRANKS BUTTON NOT FOUND) -> ticker: ${this.ticker} -> analyst:${this.analystName}`
      )
      return false
    }
  }

  async waitForXpath(xpath) {
    const { page, ticker, analystName, timeout } = this
    try {
      await page.waitForXPath(xpath, { timeout })
      return true
    } catch (err) {
      if (err.message.includes("is not a valid XPath expression")) {
        console.log("*** INVALID XPATH *** xpath: " + xpath)
      } else {
        console.log(
          `PageDataFetcher.waitForXpath failed for xpath: ${xpath} -> ticker ${ticker} -> analyst: ${analystName}`
        )
      }
      return false
    }
  }

  async fetchPageData(xPathArr, selectorToWaitFor) {
    const { analystName, page, ticker } = this

    if (!page) {
      console.error(
        `PageDataFetcher.fetchPageData (this.page IS NULL) -> ticker: ${ticker} -> analyst:${analystName}`
      )
      return []
    }

    const xpathFound = await this.waitForXpath(selectorToWaitFor || xPathArr[0])
    if (!xpathFound) {
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
        `PageDataFetcher.fetchFidelityReportData (this.page IS NULL) -> ticker: ${this.ticker}`
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
   * @param {string} selector
   * @returns {Promise<void>|*}
   */
  click(selector) {
    const { page, ticker, analystName } = this

    if (!page || !selector) {
      return Promise.resolve()
    }

    return page.click(selector).catch(() => {
      console.log(
        `page click failed for selector: ${selector} -> ticker: ${ticker} -> analyst ${analystName}`
      )
    })
  }

  /**
   * @param {string} selector
   * @returns {Promise<void>}
   */
  async clickWhile(selector) {
    const { page, ticker, analystName } = this

    if (!page || !selector) {
      return
    }

    while (await page.$(selector)) {
      await page.click(selector).catch(() => {
        console.log(
          `clickIF failed for selector: ${selector} -> ticker: ${ticker} -> analyst ${analystName}`
        )
      })

      await new Promise(res => setTimeout(res, 100))
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
