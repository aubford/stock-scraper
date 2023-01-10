const { JSDOM } = require("jsdom")
const fs = require("fs")
const Logger = require("./Logger")

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
    return this.spawn(this.document().querySelector(selector))
  }

  $$(selector) {
    return Array.from(this.document().querySelectorAll(selector)).map(this.spawn)
  }

  _xpath(xpath) {
    const document = this.document()
    const contextNode = this.getElement()
    return document.evaluate(xpath, contextNode, null, 9, null).singleNodeValue
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
    this.logger.error("No element found for xpath: " + xpath)
  }

  $$x(xpath) {
    const snapshots = this._xpaths(xpath)
    if (snapshots) {
      return snapshots.map(snapshot => this.spawn(snapshot))
    }

    return []
  }

  getTextByX(xpath) {
    return this._xpath(xpath).textContent
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
   * @param {string} analystName
   * @param {string} ticker
   * @param {*} browser
   * @param {number} timeout
   */
  constructor(analystName, ticker, { timeout, testing } = {}) {
    const logger = new Logger(ticker, analystName)
    super(logger)

    this.analystName = analystName
    this.ticker = ticker
    this.timeout = timeout
    this.testing = testing
  }

  async setPage(url, scripts) {
    const options = scripts ? { runScripts: "dangerously" } : {}
    const promise = this.testing ? getTestPage(options) : JSDOM.fromURL(url, options)
    this.dom = await promise
  }

  logHTML() {
    const html = this.dom.serialize()
    fs.writeFileSync("./test/jsdomOutput", html)
  }
}

module.exports = JsDomFetcher
