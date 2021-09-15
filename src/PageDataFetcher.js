const { zip, fromPairs } = require("lodash")
const { wrapPage, pause, newBrowserPage, evalX } = require("./util")
const Logger = require("./Logger")

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
    this.logger = new Logger(ticker, analystName)
  }

  newPage(url, options) {
    return newBrowserPage(this.browser, url, options)
  }

  async setPage(url, options) {
    if (url) {
      this.page = await this.newPage(url, {
        waitUntil: "domcontentloaded",
        logger: this.logger,
        ...options,
      })
    }
  }

  async setPageTrPopup() {
    this.originPage = await this.newPage(
      `https://invest.ameritrade.com/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/analystreports?symbol=${this.ticker}&c_name=invest_VENDOR`,
      { waitUntil: "networkidle0", logger: this.logger }
    )

    if (this.originPage.error) {
      return false
    }

    const getMainFrame = async () => {
      let frameMain = this.originPage.frames().find(frame => frame.name() === "main")
      if (!frameMain) {
        this.logger.warn(`Main Frame not found on first pass`)
        await pause(3500)
        frameMain = this.originPage.frames().find(frame => frame.name() === "main")
        if (!frameMain) {
          this.logger.error(`*** Main Frame not found on second pass ***`)
        }
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
        this.logger.warn(`Error on click even though Tipranks button exists`)
      })
      this.page = await new Promise(res =>
        this.browser.once("targetcreated", target => res(target.page()))
      )

      if (!this.page) {
        this.logger.error(`this.page is null for Tipranks popup`)
        return false
      }

      wrapPage(this.page)
      return true
    } else {
      this.logger.warn(`No Tipranks button found`)
      return false
    }
  }

  async waitForXpath(xpath) {
    const { page, timeout } = this
    try {
      await page.waitForXPath(xpath, { timeout })
      return true
    } catch (err) {
      if (err.message.includes("is not a valid XPath expression")) {
        this.logger.error("*** INVALID XPATH *** for xpath: " + xpath)
      } else {
        this.logger.warn(`PageDataFetcher.waitForXpath failed for xpath: ${xpath}`)
      }
      return false
    }
  }

  async fetchPageData(xPathArr, selectorToWaitFor) {
    if (!this.page) {
      this.logger.error(`Error: Page is NULL`)
      return []
    }

    const xpathFound = await this.waitForXpath(selectorToWaitFor || xPathArr[0])
    if (!xpathFound) {
      return []
    }

    const values = await Promise.all(xPathArr.map(this.page.getTextByX))
    this.logger.completeOk("Page: Done")
    return values
  }

  async fetchFidelityReportData(fidelityReportNameArr) {
    const { page } = this
    if (!page) {
      this.logger.error(`PageDataFetcher.fetchFidelityReportData (this.page IS NULL)`)
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
    const { page } = this

    if (!page || !selector) {
      return Promise.resolve()
    }

    return page.click(selector).catch(() => {
      this.logger.warn(`Page click failed for selector: ${selector}`)
    })
  }

  /**
   * @param {string} selector
   * @returns {Promise<void>}
   */
  async clickWhile(selector) {
    if (!this.page || !selector) {
      return
    }

    while (await this.page.$(selector)) {
      await this.page.click(selector).catch(() => {
        this.logger.warn(`Error: [clickWhile] Click failed for selector: ${selector}`)
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

module.exports = PageDataFetcher
