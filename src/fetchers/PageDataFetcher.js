const { evalX, getTextByX, newPage, goToPage } = require("../puppeteer-utils")
const { ReError, MessageError, WarnError, getHtmlOrJson } = require("../util")

class PageDataFetcher {
  /**
   * @param {string} ticker
   * @param {*} browser
   * @param {object} logger
   * @param {object} options
   * @param {number} options.timeout
   */
  constructor(ticker, browser, logger, { timeout } = {}) {
    this.ticker = ticker
    this.browser = browser
    this.timeout = timeout || XPATH_TIMEOUT

    this.page = null
    this.originPage = null
    this.responseInterceptors = []
    this.runInterceptors = this.runInterceptors.bind(this)

    this.logger = logger
  }

  /**
   * @param {string} url
   * @param {Object} [options]
   * @returns {Promise<MyPage>}
   * @private
   */
  async _newPage(url, options) {
    if (this.page && !this.page.isClosed()) {
      await this.page.closeSafe()
    }

    this.page = await newPage(this.browser)

    if (this.responseInterceptors.length) {
      await this.interceptRequests(this.runInterceptors)
    }

    await goToPage(this.page, url, options)

    return this.page
  }

  async interceptRequests(runInterceptors) {
    await this.page.setRequestInterception(true)

    this.page.on("request", req => {
      req.continue()
    })

    this.page.on("response", res => {
      runInterceptors(res, this.page)
    })
  }

  runInterceptors(response) {
    Promise.all(
      this.responseInterceptors.map(responseInterceptor => responseInterceptor(response))
    )
  }

  async responseInterceptor(res, searchArr, handleInterception, exact) {
    const url = res.url()
    const isMatch = exact
      ? searchArr.some(search => url === search)
      : searchArr.some(search => url.includes(search))

    if (isMatch) {
      const htmlOrJson = await getHtmlOrJson(res)
      handleInterception(htmlOrJson)
    }
  }

  addResponseInterceptor(searchArr, handleInterception, exact) {
    this.responseInterceptors.push(response =>
      this.responseInterceptor(response, searchArr, handleInterception, exact).catch(err => {
        if (err instanceof WarnError) {
          return this.logger.warnError(
            new WarnError("skipped irrelevant response", "responseInterceptor", err)
          )
        }

        this.logger.logError(
          new ReError("error for search: " + searchArr.join(", "), err, "responseInterceptor")
        )
      })
    )
  }

  /**
   * Go to a new page and set interceptors if any
   * have been added to the PageDataFetcher
   * @param {string} url
   * @param {Object} [options]
   * @returns {Promise<MyPage>}
   */
  setPage(url, options) {
    if (!url) {
      throw new MessageError("No url provided", "PageDataFetcher.setPage")
    }

    return this._newPage(url, {
      waitUntil: "domcontentloaded",
      logger: this.logger,
      ...options,
    }).catch(err => {
      throw new ReError("error caught", err, "PageDataFetcher._newPage")
    })
  }

  _checkForPage() {
    if (!this.page) {
      throw new MessageError("No page available")
    }
  }

  waitForXpath(xpath, frame) {
    return (frame || this.page).waitForXPath(xpath, { timeout: this.timeout }).catch(err => {
      if (err.message.includes("is not a valid XPath expression")) {
        this.logger.logError(
          new MessageError("*** INVALID XPATH *** for xpath: " + xpath, "waitForXpath")
        )
      } else {
        // todo: handle this up the chain based on importance
        this.logger.warnError(new MessageError(`failed for xpath: ${xpath}`, "waitForXpath"))
      }
      return false
    })
  }

  async _waitForFrame(frameName) {
    const frame = await this.page
      .waitForFrame(frame => frame.name() === frameName)
      .catch(error => {
        throw new ReError(`waitForFrame failed for frame ${frameName}`, error, "_waitForFrame")
      })
    if (!frame) {
      throw new MessageError(`Frame "${frameName}" NOT FOUND 🚨`, "_waitForFrame")
    }
    return frame
  }

  async _fetchPageDataInFrame(xPathArr, frameName, selectorToWaitFor) {
    this._checkForPage()

    const mainFrame = await this._waitForFrame(frameName)

    const xpathFound = await this.waitForXpath(selectorToWaitFor || xPathArr[0], mainFrame)
    if (!xpathFound) {
      throw new MessageError(`Xpath not found for selector: ${selectorToWaitFor}`)
    }

    const values = await Promise.all(xPathArr.map(xpath => getTextByX(mainFrame, xpath)))
    this.logger.completeOk("Page in Frame: Done")
    return values
  }

  fetchPageDataInFrame(xPathArr, frameName, selectorToWaitFor) {
    return this._fetchPageDataInFrame(xPathArr, frameName, selectorToWaitFor).catch(err => {
      this.close().finally(() => {
        throw new ReError("Failed to fetch page data in frame", err, "fetchPageDataInFrame")
      })
    })
  }

  async _fetchPageData(xPathArr, selectorToWaitFor) {
    this._checkForPage()

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
      this.close().finally(() => {
        throw new ReError("Failed to fetch page data", err, "fetchPageData")
      })
    })
  }

  _waitForSelector(selector) {
    this._checkForPage()
    if (!selector) {
      throw new MessageError(`Missing selector`)
    }

    return this.page.waitForSelector(selector, { timeout: this.timeout }).catch(err => {
      throw new ReError(`failed for selector: ${selector}`, err, "_waitForSelector")
    })
  }

  /**
   * @param {string} selector
   * @returns {Promise<void>|*}
   */
  async _click(selector) {
    this._checkForPage()
    if (!selector) {
      throw new MessageError(`Missing selector`)
    }

    const el = await this._waitForSelector(selector)
    return el.click().catch(err => {
      throw new ReError(`Page click failed for selector: ${selector}`, err)
    })
  }

  click(selector) {
    return this._click(selector).catch(err => {
      this.logger.logError(err)
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
      this.logger.logError(err)
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
      this.logger.logError(err)
    })
  }

  /**
   * @param selector
   * @returns {Promise<string|string[]>}
   */
  fetchHref(selector) {
    return evalX(this.page, selector, node => node.href).catch(err => {
      this.logger.logError(err)
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
      this.logger.logError(err)
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
