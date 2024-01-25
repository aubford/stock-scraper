const { JSDOM } = require("jsdom")
const fs = require("fs")
const Logger = require("../Logger")

const getTestPage = options => JSDOM.fromFile("./http/response.html", options)

class JsDomNode {
  constructor(logger, element, dom) {
    this.dom = dom
    this.element = element
    this.logger = logger
  }

  spawn(element) {
    return new JsDomElement(this.logger, element, this.dom)
  }

  /**
   * @returns {Document}
   */
  document() {
    return this.dom.window.document
  }

  getElement() {
    return this.document()
  }

  $(selector) {
    const el = this.document().querySelector(selector)
    if (el) {
      return this.spawn(el)
    }
    this.logger.error("No element found for selector: " + selector)
  }

  $$(selector) {
    const elementArr = Array.from(this.document().querySelectorAll(selector))
    if (elementArr.length && elementArr.every(el => el)) {
      return elementArr.map(this.spawn)
    }
  }

  _xpath(xpath) {
    const document = this.document()
    const contextNode = this.getElement()
    const node = document.evaluate(xpath, contextNode, null, 9, null).singleNodeValue
    if (node) {
      return node
    }
    this.logger.error("No element found for xpath: " + xpath)
  }

  _xpaths(xpath) {
    const document = this.document()
    const contextNode = this.getElement()
    const result = document.evaluate(xpath, contextNode, null, 7, null)

    if (result.snapshotLength) {
      return Array.from({ length: result.snapshotLength }, (_, i) => result.snapshotItem(i))
    }

    this.logger.error("No element found for xpath: " + xpath)
  }

  $x(xpath) {
    const node = this._xpath(xpath)
    if (node) {
      return this.spawn(node)
    }
  }

  $$x(xpath) {
    const snapshots = this._xpaths(xpath)
    if (snapshots) {
      return snapshots.map(snapshot => this.spawn(snapshot))
    }

    return []
  }

  getTextByX(xpath) {
    const node = this._xpath(xpath)
    if (node) {
      return node.textContent
    }
  }

  getTextArrByX(xpath) {
    const snapshots = this._xpaths(xpath)
    if (snapshots) {
      return snapshots.map(({ textContent }) => textContent)
    }

    return []
  }
}

class JsDomElement extends JsDomNode {
  constructor(logger, element, dom) {
    super(logger, element, dom)
    this.textContent = element.textContent
  }

  getElement() {
    return this.element
  }
}

class JsDomFetcher extends JsDomNode {
  /**
   * @param {string} contextName
   * @param {string} ticker
   * @param {*} browser
   * @param {number} timeout
   */
  constructor(contextName, ticker, { timeout, testing } = {}) {
    const logger = new Logger(ticker, contextName + " JsDomFetcher", true)
    super(logger)

    this.ticker = ticker
    this.timeout = timeout
    this.testing = testing
  }

  async setPage(url, scripts) {
    const options = scripts ? { runScripts: "dangerously" } : {}
    this.dom = await (this.testing ? getTestPage(options) : JSDOM.fromURL(url, options))
  }

  logHTML() {
    const html = this.dom.serialize()
    fs.writeFileSync("../../test/jsdomOutput.html", html)
  }
}

module.exports = JsDomFetcher
