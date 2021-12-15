require("puppeteer-core")
const moment = require("moment")
const {
  assignWith,
  first,
  last,
  endsWith,
  fromPairs,
  omit,
  zip,
  chunk,
  zipWith,
} = require("lodash")
const readline = require("readline")
const Logger = require("./Logger")

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

const wrapPage = page => {
  page.getTextByX = text =>
    getTextByX(page, text).catch(err => console.error("🚨 getTextByX: ", err))

  page.closeSafe = () => {
    const isOpen = page && !page.isClosed()

    if (isOpen) {
      return page.close().catch(err => {
        console.error("🚨 Page Close Error: ", err)
      })
    }
    return Promise.resolve()
  }

  try {
    page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)
  } catch (err) {
    console.error("🚨 setDefaultNavigationTimeout:" + err)
  }
}

/** @returns {Promise<MyPage>} */
const newBrowserPage = async (browser, url, options = {}) => {
  /** @type {MyPage} */
  const page = await browser.newPage()
  wrapPage(page)

  try {
    await page.goto(url, options)
  } catch (error) {
    const msg = `🚨 PAGE LOAD ERROR -> ${error}`
    throw new Error(msg)
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

const selfTextContains = text => `//*[${containsChars(text)}]`

const prevSiblingTextContains = (text, num = 1) =>
  `//span[${containsChars(text)}]/following-sibling::span[${num}]`

const prevSiblingTextIs = (text, num = 1) =>
  `//span[${matchChars(text)}]/following-sibling::span[${num}]`

const followingSiblingTextIs = (text, num = 1) =>
  `//span[${matchChars(text)}]/preceding-sibling::span[${num}]`

const prevSiblingTextIsStar = (text, num = 1) =>
  `//*[${matchChars(text)}]/following-sibling::*[${num}]`

const followingSiblingTextIsStar = (text, num = 1) =>
  `//*[${matchChars(text)}]/preceding-sibling::*[${num}]`

const hasCFRA = (rating, ticker, analystName) => {
  const hasReport = rating !== "no rating"
  if (!hasReport) {
    new Logger(ticker, analystName).warn(`NO REPORT`)
  }
  return hasReport
}

const writeFile = (location, data) => {
  try {
    fs.writeFileSync(location, JSON.stringify(data))
    console.log(`** WRITE TO FILE: ${location} -> SUCCESS **`)
  } catch (err) {
    console.log("File Write Error: " + err)
    process.exit(1)
  }
}

const readFile = location => {
  const file = fs.readFileSync(location)
  return JSON.parse(file)
}

const backupReturnStockDataFile = () => {
  fs.copyFileSync(
    STOCK_DATA_BACKUP_LOCATION,
    `${SCRAPBOOK_LOCATION}/stockDataBackup_backup_${moment().format()}.json`
  )
  fs.copyFileSync(STOCK_DATA_LOCATION, STOCK_DATA_BACKUP_LOCATION)
  return readFile(STOCK_DATA_LOCATION)
}

const scrapbookWriteOut = (data, shouldMerge) => {
  /** @type {*} */
  const stockDataFile = fs.readFileSync(STOCK_DATA_LOCATION)
  const existingData = JSON.parse(stockDataFile)
  const writeToFile = shouldMerge
    ? assignWith({}, existingData, data, (a, b) => ({ ...a, ...b }))
    : {
        ...existingData,
        ...data,
      }

  writeFile(STOCK_DATA_LOCATION, writeToFile)
  writeShortDatesToMeta(writeToFile)
}

const writeShortDatesToMeta = data => {
  /** @type {*} */
  const existingFile = fs.readFileSync(META_LOCATION)
  const existingMeta = JSON.parse(existingFile)

  const wsjShortDateList = makeWsjShortDateList(data, existingMeta)

  writeFile(META_LOCATION, {
    ...existingMeta,
    wsjShortDateList,
    wsjShortDatePrev: wsjShortDateList[wsjShortDateList.length - 2],
  })
}

const makeWsjShortDateList = (data, existingMeta) => {
  const { wsjShortDate } = Object.values(data).find(({ wsjShortDate }) => !!wsjShortDate)
  const { wsjShortDateList } = existingMeta

  return wsjShortDateList.includes(wsjShortDate)
    ? wsjShortDateList
    : wsjShortDateList.concat(wsjShortDate)
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

const promptLogin = newPage => {
  const pages = [
    "https://olui2.fs.ml.com/TFPHoldings/HoldingsByAccount.aspx?as_cd=1.4.2147483647.-1",
    "https://oltx.fidelity.com/ftgw/fbc/oftop/portfolio#summary",
    "https://www.moodys.com/credit-ratings/ATT-Inc-credit-rating-702550",
    "https://invest.ameritrade.com/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/analystreports?symbol=USB&c_name=invest_VENDOR",
  ].map(url => newPage(url, { waitUntil: "domcontentloaded" }))

  return () => {
    Promise.all(pages).then(pages =>
      pages.forEach(page => {
        page.closeSafe()
      })
    )
  }
}

const pause = async ms => {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

const getFidelitySecretUrl = async (fidelityLink, browser, ticker) => {
  const logger = new Logger(ticker, "Fidelity Secret URL")
  logger.log(`getFidelitySecretUrl browser = ${browser}`)
  if (!fidelityLink) {
    return null
  }
  const page = await newBrowserPage(browser, fidelityLink, { logger })
  try {
    const src = await page.$eval("frame", node => node.getAttribute("src"))
    logger.completeOk("getFidelitySecretUrl: Done")
    return `https://research2.fidelity.com/cgi-bin/upload.dll/${src}`
  } catch (err) {
    logger.error("failed to getFidelitySecretUrl")
    return null
  } finally {
    await page.closeSafe()
  }
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

const makePrettyDate = () => moment().format("MMM DD h:mma")

const getOnlyStockTickerData = stockJsonData =>
  omit(stockJsonData, ["magicTickers", "buffetData", "earningsDates"])

module.exports = {
  backupReturnStockDataFile,
  getOnlyStockTickerData,
  evalX,
  extractNumbers,
  followingSiblingTextIs,
  followingSiblingTextIsStar,
  prevSiblingTextIsStar,
  getFidelitySecretUrl,
  getFirstLastValue,
  getTextByX,
  hasCFRA,
  millBillStrToNum,
  newBrowserPage,
  readFile,
  parseStreetBulletData,
  pause,
  prevSiblingTextContains,
  prevSiblingTextIs,
  promptForTickers,
  promptLogin,
  promptUser,
  scrapbookWriteOut,
  writeFile,
  wrapPage,
  makePrettyDate,
  selfTextContains,
}
