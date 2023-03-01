const {
  wrapPage,
  evalX,
  getTextByX,
  newPage,
  goToPage,
  interceptRequests,
  responseInterceptorFuzzy,
} = require("./puppeteer")
const Logger = require("./Logger")
const { ReError, MessageError } = require("./util")

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

  _checkForPage() {
    if (!this.page) {
      throw new MessageError("No page available")
    }
  }

  getLogger() {
    return this.logger
  }

  addResponseInterceptorFuzzy(searchArr, callback) {
    this.addResponseInterceptor(response => {
      try {
        responseInterceptorFuzzy(response, searchArr, callback)
      } catch (err) {
        this.logger.logError(
          new ReError(
            "error for search: " + searchArr.join(", "),
            err,
            "addResponseInterceptorFuzzy"
          )
        )
      }
    })
  }

  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor)
  }

  async _newPage(url, options) {
    this.page = await newPage(this.browser)

    if (this.responseInterceptors.length) {
      await interceptRequests(this.page, this.runInterceptors)
    }

    await goToPage(this.page, url, options)

    return this.page
  }

  newPage(url, options) {
    return this._newPage(url, options).catch(err => {
      this.logger.logError(new ReError("Promise error caught loading newPage", err, "newPage"))
    })
  }

  async setPage(url, options) {
    if (url) {
      await this.newPage(url, {
        waitUntil: "domcontentloaded",
        logger: this.logger,
        ...options,
      })
    } else {
      this.logger.logError(new MessageError("No url provided", "setPage"))
    }
  }

  async _setPageTrPopup() {
    this.originPage = await this.newPage(
      `https://invest.ameritrade.com/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/analystreports?symbol=${this.ticker}&c_name=invest_VENDOR`,
      { waitUntil: "domcontentloaded", logger: this.logger }
    )

    if (this.originPage.error) {
      throw new ReError("this.originPage.error", this.originPage.error)
    }

    const analystReportsFrame = await this.originPage.waitForFrame(async frame =>
      frame.url().includes("highcharts-analyst-reports")
    )

    if (!analystReportsFrame) {
      throw new MessageError("No Tipranks data found")
    }

    const tipranksButton = await analystReportsFrame
      .waitForSelector("button.see-full-report", {
        timeout: 5000,
      })
      .catch(err => {
        throw new ReError("No Tipranks button found", err)
      })

    await tipranksButton
      .evaluate(el => el.click())
      .catch(err => {
        throw new ReError(`Error on click even though Tipranks button exists`, err)
      })

    const newTarget = await this.browser
      .waitForTarget(target => target.type() === "page" && target.url().includes("popup"))
      .catch(err => {
        throw new ReError(`this.browser.waitForTarget failed`, err)
      })

    this.page = await newTarget.page()

    if (!this.page) {
      throw new MessageError(`this.page is null for Tipranks popup`)
    }

    wrapPage(this.page)
    return true
  }

  setPageTrPopup() {
    return this._setPageTrPopup()
      .then(result => result)
      .catch(err => {
        this.logger.warnError(err, "setPageTrPopup")
        return false
      })
  }

  waitForXpath(xpath, frame) {
    return (frame || this.page).waitForXPath(xpath, { timeout: this.timeout }).catch(err => {
      if (err.message.includes("is not a valid XPath expression")) {
        this.logger.logError(
          new MessageError("*** INVALID XPATH *** for xpath: " + xpath, "waitForXpath")
        )
      } else {
        this.logger.warnError(new MessageError(`failed for xpath: ${xpath}`, "waitForXpath"))
      }
      return false
    })
  }

  async waitForFrame(frameName) {
    const frame = await this.page
      .waitForFrame(frame => frame.name() === frameName)
      .catch(error => {
        throw new ReError(`waitForFrame failed for frame ${frameName}`, error, "waitForFrame")
      })
    if (!frame) {
      throw new MessageError(`Frame "${frameName}" NOT FOUND 🚨`, "waitForFrame")
    }
    return frame
  }

  async _fetchPageDataInFrame(xPathArr, frameName, selectorToWaitFor) {
    this._checkForPage()

    const mainFrame = await this.waitForFrame(frameName)

    const xpathFound = await this.waitForXpath(selectorToWaitFor || xPathArr[0], mainFrame)
    if (!xpathFound) {
      return []
    }

    const values = await Promise.all(xPathArr.map(xpath => getTextByX(mainFrame, xpath)))
    this.logger.completeOk("Page in Frame: Done")
    return values
  }

  fetchPageDataInFrame(xPathArr, frameName, selectorToWaitFor) {
    return this._fetchPageDataInFrame(xPathArr, frameName, selectorToWaitFor).catch(err => {
      this.logger.logError(err, "fetchPageDataInFrame")
      return []
    })
  }

  async _fetchPageData(xPathArr, selectorToWaitFor) {
    if (!this.page) {
      throw new MessageError(`Error: Page is NULL`)
    }

    const xpathFound = await this.waitForXpath(selectorToWaitFor || xPathArr[0])
    if (!xpathFound) {
      return []
    }

    const values = await Promise.all(xPathArr.map(this.page.getTextByX))
    this.logger.completeOk("Page: Done")
    return values
  }

  fetchPageData(xPathArr, selectorToWaitFor) {
    return this._fetchPageData(xPathArr, selectorToWaitFor).catch(err => {
      this.logger.logError(err, "fetchPageData")
      return []
    })
  }

  waitForSelector(selector) {
    if (!this.page) {
      throw new MessageError(`Missing page (selector: ${selector})`, "waitForSelector")
    }

    return this.page.waitForSelector(selector, { timeout: this.timeout }).catch(err => {
      throw new ReError(`failed for selector: ${selector}`, err, "waitForSelector")
    })
  }

  /**
   * @param {string} selector
   * @returns {Promise<void>|*}
   */
  async _click(selector) {
    if (!this.page || !selector) {
      throw new MessageError(`Missing page/selector (selector: ${selector})`)
    }

    const el = await this.waitForSelector(selector)
    return el.click().catch(err => {
      throw new ReError(`Page click failed for selector: ${selector}`, err)
    })
  }

  click(selector) {
    return this._click(selector).catch(err => {
      this.logger.logError(err, "click")
    })
  }

  async _clickForXpath(xPath) {
    if (!this.page || !xPath) {
      throw new MessageError(`Missing page/xPath (xPath: ${xPath})`)
    }

    const el = await this.waitForXpath(xPath)
    if (el) {
      return el.click().catch(err => {
        this.logger.warnError(
          new ReError(`Page click failed for xPath: ${xPath}`, err, "clickForXpath")
        )
      })
    }
    this.logger.warnError(
      new MessageError(`Element not found for page click for xpath: ${xPath}`, "clickForXpath")
    )
  }

  clickForXpath(xPath) {
    return this._clickForXpath(xPath).catch(err => {
      this.logger.logError(err, "clickForXpath")
    })
  }

  /**
   * @param {string} selector
   * @returns {Promise<void>}
   */
  async _clickWhile(selector) {
    if (!this.page || !selector) {
      throw new MessageError(`Missing page/selector (selector: ${selector})`)
    }

    while (await this.page.$(selector)) {
      await this.page.click(selector).catch(() => {
        this.logger.warn(`[clickWhile] Click failed for selector: ${selector}`)
      })

      await new Promise(res => setTimeout(res, 100))
    }
  }

  clickWhile(selector) {
    return this._clickWhile(selector).catch(err => {
      this.logger.logError(err, "clickWhile")
    })
  }

  /**
   * @param selector
   * @returns {Promise<string|string[]>}
   */
  fetchHref(selector) {
    return evalX(this.page, selector, node => node.href).catch(err => {
      this.logger.logError(err, "fetchHref")
    })
  }

  /**
   * @param {String} selector
   * @param {String} attribute
   * @returns {Promise<string|string[]>}
   */
  fetchAttribute(selector, attribute) {
    return evalX(
      this.page,
      selector,
      (node, attr) => node.getAttribute(attr),
      attribute
    ).catch(err => {
      this.logger.logError(err, "fetchAttribute")
    })
  }

  async close() {
    if (this.originPage && !this.originPage.isClosed()) {
      await this.originPage.closeSafe()
    }
    if (this.page && !this.page.isClosed()) {
      await this.page.closeSafe()
    }
  }
}

module.exports = PageDataFetcher
