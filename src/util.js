require("puppeteer-core")
const { first, last, endsWith, fromPairs, zip, chunk, zipWith } = require("lodash")
const readline = require("readline")
/**
 * @typedef {Page} MyPage
 * @property getTextByX
 * @property closeSafe
 * @property error
 */

/**
 * @param page {MyPage}
 * @param selector {string}
 * @returns {Promise<string|string[]>}
 */
const getTextByX = async (page, selector) => {
  const elementArr = await page.$x(selector)
  if (!elementArr.length) {
    return ""
  }
  if (elementArr.length === 1) {
    return await elementArr[0].evaluate(({ textContent }) =>
      textContent ? textContent.trim() : ""
    )
  }
  return await Promise.all(
    elementArr.map(element =>
      element.evaluate(({ textContent }) => (textContent ? textContent.trim() : ""))
    )
  )
}

/** @returns {Promise<MyPage>} */
const newBrowserPage = async (browser, url, options = {}) => {
  /** @type {MyPage} */
  const page = await browser.newPage()
  page.getTextByX = text => getTextByX(page, text)
  page.closeSafe = () => page.close().catch(err => err)

  try {
    await page.goto(url, options)
  } catch (error) {
    console.log("Error loading page:" + error)
    page.error = error
    return page
  }

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
  const fullTextBullets = zipWith(lineOne, lineTwo, (a, b) => `${a} ${b}`)
  const chunked = chunk(fullTextBullets, 2)
  const mapped = chunked.map(([bulletA, bulletB]) => {
    if (bulletA.includes("Neutral")) {
      return ""
    }
    return firstBulletIndicators.find(({ indicator }) => bulletA.includes(indicator))
      .value[bulletB.includes("significant") ? 1 : 0]
  })

  return fromPairs(
    zip(
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
 * @param {Frame|Page} frame
 * @param selector {string}
 * @param {*} func
 * @returns {Promise<string|string[]>}
 */
const evalX = async (frame, selector, ...func) => {
  const elementArr = (await frame.$x(selector)) || []
  if (!elementArr.length) {
    return ""
  }
  if (elementArr.length === 1) {
    return await elementArr[0].evaluate(...func)
  }
  return await Promise.all(elementArr.map(element => element.evaluate(...func)))
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

const writeFile = (location, data) => {
  fs.writeFile(location, JSON.stringify(data), err => {
    console.log("** COMPLETE, WRITING TO FILE **")
    if (err) {
      console.log("File Write Error: " + err)
    }
    process.exit(0)
  })
}

const scrapbookWriteOut = data => {
  const stockDataLocation = `${SCRAPBOOK_LOCATION}/stockData.json`
  /** @type {*} */
  const stockDataFile = fs.readFileSync(stockDataLocation)
  const existingData = JSON.parse(stockDataFile)
  const writeToFile = {
    ...existingData,
    ...data,
  }

  writeFile(stockDataLocation, writeToFile)
}

const promptUser = async question => {
  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    readlineInterface.question(question, text => {
      resolve(text)
      readlineInterface.close()
    })
  })
}

const promptForTickers = () => promptUser("Tickers: ")

const promptForPause = async () => {
  const pauseTimeout = await promptUser("Pause Timeout: ")
  global.PAUSE_MS = pauseTimeout ? pauseTimeout * 1000 * 60 : PAUSE_MS
  console.log("PAUSE MS", PAUSE_MS)
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

const pauseExecution = async (ticker, tickers) => {
  // Pause every 5 tickers
  const tickerIndex = tickers.indexOf(ticker)
  if ((tickerIndex + 1) % 6 === 0) {
    console.log("((pause))")
    await new Promise(resolve => setTimeout(resolve, PAUSE_MS))
  }
}

const getFidelitySecretUrl = async (fidelityLink, browser) => {
  if (!fidelityLink) {
    return null
  }
  const page = await newBrowserPage(browser, fidelityLink)
  try {
    const src = await page.$eval("frame", node => node.getAttribute("src"))
    return `https://research2.fidelity.com/cgi-bin/upload.dll/${src}`
  } catch (err) {
    console.error("failed to getFidelitySecretUrl")
    return null
  } finally {
    await page.closeSafe()
  }
}

const backupReturnStockDataFile = () => {
  fs.copyFileSync(STOCK_DATA_LOCATION, STOCK_DATA_BACKUP_LOCATION)
  /** @type * */
  const file = fs.readFileSync(STOCK_DATA_LOCATION)
  return JSON.parse(file)
}

const getFirstLastValue = str => {
  const split = str ? str.split(/\s/) : []
  return [first(split), last(split)]
}

const extractNumbers = text =>
  text && text !== "--" ? text.match(/[\d,\\.]/g).join("") : ""

const millBillStrToNum = str => {
  const num = extractNumbers(str)
  if (endsWith(str, "M") || endsWith(str, "B")) {
    const mult = endsWith(str, "M") ? 1000 ** 2 : 1000 ** 3
    return num * mult
  }
  return num
}

module.exports = {
  backupReturnStockDataFile,
  evalX,
  extractNumbers,
  followingSiblingTextIs,
  getFidelitySecretUrl,
  getFirstLastValue,
  getTextByX,
  hasCFRA,
  millBillStrToNum,
  newBrowserPage,
  parseStreetBulletData,
  pauseExecution,
  prevSiblingTextContains,
  prevSiblingTextIs,
  promptForPause,
  promptForTickers,
  promptLogin,
  promptUser,
  scrapbookWriteOut,
  writeFile,
}
