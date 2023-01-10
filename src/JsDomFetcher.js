const { JSDOM } = require("jsdom")
const fs = require("fs")
const Logger = require("./Logger")

const getTestPage = options => JSDOM.fromFile("./http/response.html", options)

class JsDomFetcher {
  /**
   * @param {string} analystName
   * @param {string} ticker
   * @param {*} browser
   * @param {number} timeout
   */
  constructor(analystName, ticker, { timeout, testing }) {
    this.analystName = analystName
    this.ticker = ticker
    this.timeout = timeout
    this.testing = testing

    this.dom = null
    this.logger = new Logger(ticker, analystName)
  }

  /**
   * @returns {Document}
   */
  document() {
    return this.dom.window.document
  }

  $(selector) {
    return this.document().querySelector(selector)
  }

  $$(selector) {
    return Array.from(this.document().querySelectorAll(selector))
  }

  $x(xpath) {
    const document = this.document()
    return document.evaluate(xpath, document, null, 9, null).singleNodeValue
  }

  $$x(xpath) {
    const document = this.document()
    const result = document.evaluate(xpath, document, null, 7, null)
    return Array.from({ length: result.snapshotLength }, (_, i) => result.snapshotItem(i))
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

const test = async () => {
  const fetcher = new JsDomFetcher("Test", "Test", { testing: true })
  await fetcher.setPage()
  const res = fetcher.$$x("//div")[0]
  const out = res.querySelectorAll("* > div")

  console.log(out)
}
test()

module.exports = JsDomFetcher
