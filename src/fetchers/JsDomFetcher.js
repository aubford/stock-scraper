const { JSDOM } = require("jsdom")
const fs = require("fs")
const { MessageError } = require("../util")

const getTestPage = options =>
  JSDOM.fromFile("/Users/aubrey/workspace/stock-scraper/http/response.html", options)

class JsDomNode {
  /**
   * @param {Element} element
   * @param {JSDOM} dom
   */
  constructor(element, dom) {
    this.dom = dom
    this.element = element
  }

  /**
   * @param {Element} element
   * @returns {JsDomElement}
   */
  spawn(element) {
    return new JsDomElement(element, this.dom)
  }

  /**
   * @returns {Document}
   */
  document() {
    return this.dom.window.document
  }

  /**
   * @returns {Document}
   */
  getElement() {
    return this.document()
  }

  /**
   * @param {string} selector
   * @returns {JsDomElement}
   */
  $(selector) {
    const el = this.document().querySelector(selector)
    if (el) {
      return this.spawn(el)
    }

    throw new MessageError(
      "No element found for selector: " + selector,
      "JsDomFetcher:JsDomNode:$"
    )
  }

  /**
   * @param {string} selector
   * @returns {JsDomElement[] | undefined}
   */
  $$(selector) {
    const elementArr = Array.from(this.document().querySelectorAll(selector))
    if (elementArr.length && elementArr.every(el => el)) {
      return elementArr.map(this.spawn)
    }
  }

  /**
   * @param {string} xpath
   * @returns {JsDomElement}
   */
  _xpath(xpath) {
    const document = this.document()
    const contextNode = this.getElement()
    const node = document.evaluate(xpath, contextNode, null, 9, null).singleNodeValue
    if (node) {
      return node
    }
    throw new MessageError(
      "No element found for xpath: " + xpath,
      "JsDomFetcher:JsDomNode:_xpath"
    ).setCode(489)
  }

  /**
   * @param {string} xpath
   * @returns {JsDomElement[]}
   */
  _xpaths(xpath) {
    const document = this.document()
    const contextNode = this.getElement()
    const result = document.evaluate(xpath, contextNode, null, 7, null)

    if (result.snapshotLength) {
      return Array.from({ length: result.snapshotLength }, (_, i) => result.snapshotItem(i))
    }

    throw new MessageError(
      "No element found for xpath: " + xpath,
      "JsDomFetcher:JsDomNode:_xpaths"
    ).setCode(489)
  }

  /**
   * @param {string} xpath
   * @returns {JsDomElement | undefined}
   */
  $x(xpath) {
    const node = this._xpath(xpath)
    if (node) {
      return this.spawn(node)
    }
  }

  /**
   * @param {string} xpath
   * @returns {JsDomElement[]}
   */
  $$x(xpath) {
    const snapshots = this._xpaths(xpath)
    if (snapshots) {
      return snapshots.map(snapshot => this.spawn(snapshot))
    }

    return []
  }

  /**
   * @param {string} xpath
   * @returns {string | undefined}
   */
  getTextByX(xpath) {
    const node = this._xpath(xpath)
    if (node) {
      return node.textContent
    }
  }

  /**
   * @param {string} xpath
   * @returns {string[]}
   */
  getTextArrByX(xpath) {
    const snapshots = this._xpaths(xpath)
    if (snapshots) {
      return snapshots.map(({ textContent }) => textContent)
    }

    return []
  }
}

class JsDomElement extends JsDomNode {
  /**
   * @param {Element} element
   * @param {JSDOM} dom
   */
  constructor(element, dom) {
    super(element, dom)
    this.textContent = element.textContent
  }

  /**
   * @returns {Element}
   */
  getElement() {
    return this.element
  }
}

/**
 * @param {Object} options
 * @param {number} options.timeout
 * @param {boolean} options.testing
 */
class JsDomFetcher extends JsDomNode {
  constructor({ timeout, testing } = {}) {
    super()

    this.timeout = timeout
    this.testing = testing
  }

  /**
   * @param {string} html
   * @param {boolean} [scripts]
   * @returns {void}
   */
  setHTMLtoDOM(html, scripts) {
    const options = scripts ? { runScripts: "dangerously" } : {}
    const res = new JSDOM(html, options)
    this.dom = res
  }

  /**
   * @param {string} url
   * @param {boolean} scripts
   */
  async setPage(url, scripts) {
    const options = scripts ? { runScripts: "dangerously" } : {}
    const res = await (this.testing ? getTestPage(options) : JSDOM.fromURL(url, options))
    this.dom = res
  }

  /** @returns {void} */
  logHTML() {
    const html = this.dom.serialize()
    fs.writeFileSync("/Users/aubrey/workspace/stock-scraper/test/jsdomOutput.html", html)
  }
}

module.exports = JsDomFetcher
