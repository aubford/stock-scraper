const { JSDOM } = require("jsdom")
const fs = require("fs")
const { MessageError } = require("../util")

const getTestPage = options => JSDOM.fromFile("./http/response.html", options)

class JsDomNode {
  constructor(element, dom) {
    this.dom = dom
    this.element = element
  }

  spawn(element) {
    return new JsDomElement(element, this.dom)
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

    throw new MessageError(
      "No element found for selector: " + selector,
      "JsDomFetcher:JsDomNode:$"
    )
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
    throw new MessageError(
      "No element found for xpath: " + xpath,
      "JsDomFetcher:JsDomNode:_xpath"
    )
  }

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
    )
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
  constructor(element, dom) {
    super(element, dom)
    this.textContent = element.textContent
  }

  getElement() {
    return this.element
  }
}

class JsDomFetcher extends JsDomNode {
  constructor({ timeout, testing } = {}) {
    super()

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
