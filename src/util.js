require("puppeteer-core")
const readline = require("readline")
const fs = require("fs")
/**
 * @typedef {Page} MyPage
 * @property getTextByX
 * @property closeSafe
 * @property error
 */

const XPATH_TIMEOUT = 20000

/**
 * @param page {MyPage}
 * @param selector {string}
 * @returns {Promise<string|string[]>}
 */
const getTextByX = async (page, selector) => {
  /** @type {ElementHandle[]} */
  const elementArr = await page.$x(selector)
  if (!elementArr.length) {
    return ""
  }
  if (elementArr.length === 1) {
    return await elementArr[0].evaluate(node => node.textContent)
  }
  return await Promise.all(elementArr.map(element => element.evaluate(node => node.textContent)))
}

/** @returns {Promise<MyPage>} */
const newBrowserPage = async (browser, url, options = {}) => {
  /** @type {MyPage} */
  const page = await browser.newPage()

  try {
    await page.goto(url, options)
  } catch (error) {
    console.log("Error loading page:" + error)
    page.error = error
    return page
  }

  page.getTextByX = text => getTextByX(page, text)
  page.closeSafe = () => page.close().catch(err => err)
  return page
}

const parseStreetBulletData = (lineOne, lineTwo) => {
  const firstBulletIndicators = [
    { indicator: "Premium", value: [2, 1] },
    { indicator: "Discount", value: [4, 5] },
    { indicator: "Average", value: [3, 3] },
    { indicator: "Higher", value: [4, 5] },
    { indicator: "Lower", value: [2, 1] },
  ]
  const fullTextBullets = _.zipWith(lineOne, lineTwo, (a, b) => `${a} ${b}`)
  const chunked = _.chunk(fullTextBullets, 2)
  const mapped = chunked.map(([bulletA, bulletB]) => {
    if (bulletA.includes("Neutral")) {
      return ""
    }
    return firstBulletIndicators.find(({ indicator }) => bulletA.includes(indicator)).value[
      bulletB.includes("significant") ? 1 : 0
    ]
  })

  return _.fromPairs(
    _.zip(
      [
        "streetPE",
        "streetPCF",
        "streetProjEarn",
        "streetPEG",
        "streetPB",
        "streetEarningsGrowth",
        "streetPSales",
        "streetSalesGrowth",
      ],
      mapped
    )
  )
}

/**
 * @param {Frame|Page|ElementHandle} frame
 * @param selector {string}
 * @param func {function}
 * @returns {Promise<string|string[]>}
 */
const evalX = async (frame, selector, func) => {
  const elementArr = (await frame.$x(selector)) || []
  if (!elementArr.length) {
    return ""
  }
  if (elementArr.length === 1) {
    return await elementArr[0].evaluate(func)
  }
  return await Promise.all(elementArr.map(element => element.evaluate(func)))
}

const chars = text => text.replace(/\s/g, "")
const matchChars = text => `translate(text()," ","")="${chars(text)}"`
const containsChars = text => `contains(translate(text()," ",""),"${chars(text)}")`
const prevSiblingTextContains = (text, num = 1) =>
  `//span[${containsChars(text)}]/following-sibling::span[${num}]`
const prevSiblingTextIs = (text, num = 1) =>
  `//span[${matchChars(text)}]/following-sibling::span[${num}]`
const followingSiblingTextIs = (text, num = 1) =>
  `//span[${matchChars(text)}]/preceding-sibling::span[${num}]`

const hasCFRA = (rating, ticker, analystName) => {
  const hasReport = rating !== "no rating"
  if (!hasReport) {
    console.log(`no report -> ticker: ${ticker} -> analyst:${analystName}`)
  }
  return hasReport
}

const SCRAPBOOK_LOCATION = "/Users/aubrey/Google Drive/stock-scrapbook"
const writeOut = data => {
  const stockDataLocation = `${SCRAPBOOK_LOCATION}/stockData.json`
  /** @type {*} */
  const stockDataFile = fs.readFileSync(stockDataLocation)
  const existingData = JSON.parse(stockDataFile)
  const writeToFile = {
    ...existingData,
    ...data,
  }

  fs.writeFile(stockDataLocation, JSON.stringify(writeToFile), err => {
    console.log("** COMPLETE, WRITING TO FILE **")
    if (err) {
      console.log("File Write Error: " + err)
    }
    process.exit(0)
  })
}

const promptForTickers = async () => {
  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    readlineInterface.question("Tickers: ", tickers => {
      resolve(tickers)
      readlineInterface.close()
    })
  })
}

const promptLogin = newPage => {
  const pages = [
    "https://olui2.fs.ml.com/TFPHoldings/HoldingsByAccount.aspx?as_cd=1.4.2147483647.-1",
    "https://oltx.fidelity.com/ftgw/fbc/oftop/portfolio#summary",
    "https://www.moodys.com/credit-ratings/ATT-Inc-credit-rating-702550",
  ].map(url => newPage(url, { waitUntil: "domcontentloaded" }))

  return () =>
    Promise.all(pages).then(pages =>
      pages.forEach(page => {
        page.closeSafe()
      })
    )
}

module.exports = {
  ARGUS_ANALYST_KEY: "Argus Analyst",
  ARGUS_RESEARCH_KEY: "Argus Research A6/Quantitative (i)",
  ZACKS_KEY: "Zacks Investment Research, Inc (i)",
  XPATH_TIMEOUT,
  FIDELITY: "fidelity",
  FORD: "ford",
  NEW_CONSTRUCTS: "nc",
  THE_STREET: "theStreet",
  ARGUS_ANALYST: "argusAnalyst",
  ARGUS_RESEARCH: "argusResearch",
  ZACKS: "zacks",
  MORNINGSTAR: "morningstar",
  CFRA: "CFRA",
  BOA: "BoA",
  PAUSE_MS: process.argv.length > 2 ? Number(process.argv[2]) * 1000 : 3000,
  SCRAPBOOK_LOCATION,
  extractNumbers: text => (text && text !== "--" ? text.match(/[\d,\\.]/g).join("") : ""),
  writeOut,
  newBrowserPage,
  parseStreetBulletData,
  evalX,
  prevSiblingTextIs,
  prevSiblingTextContains,
  followingSiblingTextIs,
  getTextByX,
  hasCFRA,
  promptForTickers,
  promptLogin,
}
