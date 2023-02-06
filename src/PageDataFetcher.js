const { zip, fromPairs } = require("lodash")
const {
  wrapPage,
  evalX,
  waitForXpath,
  getTextByX,
  newPage,
  goToPage,
  interceptRequests,
  responseInterceptorFuzzy,
} = require("./puppeteer")
const Logger = require("./Logger")

class PageDataFetcher {
  /**
   * @param {string} contextName
   * @param {string} ticker
   * @param {*} browser
   * @param {number} timeout
   */
  constructor(contextName, ticker, browser, { timeout } = {}) {
    this.ticker = ticker
    this.browser = browser
    this.timeout = timeout || XPATH_TIMEOUT

    this.page = null
    this.originPage = null
    this.responseInterceptors = []
    this.runInterceptors = response =>
      Promise.all(this.responseInterceptors.map(interceptor => interceptor(response)))

    this.logger = new Logger(ticker, contextName + " PageDataFetcher")
  }

  addResponseInterceptorFuzzy(searchArr, callback) {
    this.addResponseInterceptor(response => {
      try {
        responseInterceptorFuzzy(response, searchArr, callback)
      } catch (err) {
        console.error(
          "🚨 addResponseInterceptorFuzzy for search: " + searchArr.join(", "),
          err
        )
      }
    })
  }

  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor)
  }

  async newPage(url, options) {
    this.page = await newPage(this.browser)

    if (this.responseInterceptors.length) {
      await interceptRequests(this.page, this.runInterceptors)
    }

    await goToPage(this.page, url, options)

    return this.page
  }

  async setPage(url, options) {
    if (url) {
      await this.newPage(url, {
        waitUntil: "domcontentloaded",
        logger: this.logger,
        ...options,
      })
    }
  }

  async setPageTrPopup() {
    this.originPage = await this.newPage(
      `https://invest.ameritrade.com/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/analystreports?symbol=${this.ticker}&c_name=invest_VENDOR`,
      { waitUntil: "domcontentloaded", logger: this.logger }
    )

    if (this.originPage.error) {
      return false
    }

    const analystReportsFrame = await this.originPage.waitForFrame(async frame => {
      return frame.url().includes("highcharts-analyst-reports")
    })

    if (!analystReportsFrame) {
      this.logger.warn(`No Tipranks data found`)
      return false
    }

    let tipranksButton
    try {
      tipranksButton = await analystReportsFrame.waitForSelector("button.see-full-report", {
        timeout: 5000,
      })
    } catch (err) {
      this.logger.warn(`No Tipranks button found`)
      return false
    }

    await tipranksButton
      .evaluate(el => el.click())
      .catch(() => {
        this.logger.warn(`Error on click even though Tipranks button exists`)
      })

    const newTarget = await this.browser.waitForTarget(
      target => target.type() === "page" && target.url().includes("popup")
    )

    this.page = await newTarget.page()

    if (!this.page) {
      this.logger.error(`this.page is null for Tipranks popup`)
      return false
    }

    wrapPage(this.page)
    return true
  }

  async waitForXpath(xpath) {
    try {
      // dont just return this or try catch won't work right
      const res = await this.page.waitForXPath(xpath, { timeout: this.timeout })
      return res
    } catch (err) {
      if (err.message.includes("is not a valid XPath expression")) {
        this.logger.error("*** INVALID XPATH *** for xpath: " + xpath)
      } else {
        this.logger.warn(`PageDataFetcher.waitForXpath failed for xpath: ${xpath}`)
      }
      return false
    }
  }

  async waitForSelector(selector) {
    try {
      // dont just return this or try catch won't work right
      const res = await this.page.waitForSelector(selector, { timeout: this.timeout })
      return res
    } catch (err) {
      this.logger.warn(`PageDataFetcher.waitForSelector failed for selector: ${selector}`)
      return false
    }
  }

  async waitForFrame(frameName) {
    const log = () => this.logger.error(`Frame "${frameName}" NOT FOUND 🚨`)

    try {
      const frame = await this.page.waitForFrame(frame => frame.name() === frameName)
      if (!frame) {
        log()
        return []
      }
      return frame
    } catch (error) {
      log()
      return []
    }
  }

  async fetchPageDataInFrame(xPathArr, frameName, selectorToWaitFor) {
    if (!this.page) {
      this.logger.error(`Error: Page is NULL`)
      return []
    }

    const mainFrame = await this.waitForFrame(frameName)

    const xpathFound = await waitForXpath(
      mainFrame,
      selectorToWaitFor || xPathArr[0],
      this.timeout
    )
    if (!xpathFound) {
      return []
    }

    const values = await Promise.all(xPathArr.map(xpath => getTextByX(mainFrame, xpath)))
    this.logger.completeOk("Page in Frame: Done")
    return values
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

  // deprecated
  async fetchFidelityReportData(fidelityReportNameArr) {
    const { page } = this
    if (!page) {
      this.logger.error(`PageDataFetcher.fetchFidelityReportData (this.page IS NULL)`)
      return []
    }
    /** @type {array} */
    const reportHrefsHandles = await page.$x(`//table[@id="allOpinionsTable"]/tbody/tr/td[9]`)

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
  async click(selector) {
    const { page } = this

    if (!page || !selector) {
      this.logger.error(`Page click: No page/selector for ${selector}`)
      return await Promise.resolve()
    }

    const el = await this.waitForSelector(selector)
    if (el) {
      return el.click().catch(err => {
        this.logger.warn(`Page click failed for selector: ${selector}`, err)
      })
    }
    return this.logger.warn(`Element not found for page click for selector: ${selector}`)
  }

  async clickForXpath(xPath) {
    if (!this.page || !xPath) {
      this.logger.error(`Page click: No page/selector for ${xPath}`)
      return await Promise.resolve()
    }
    const el = await this.waitForXpath(xPath)
    if (el) {
      return el.click().catch(err => {
        this.logger.warn(`Page click failed for xPath: ${xPath}`, err)
      })
    }
    return this.logger.warn(`Element not found for page click for xpath: ${xPath}`)
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
      return await evalX(page, selector, (node, attr) => node.getAttribute(attr), attribute)
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
