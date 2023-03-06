require("puppeteer-core")
const moment = require("moment")
const { isArray, assignWith, omit } = require("lodash")
const readline = require("readline")
const { exec } = require("child_process")

/**
 * @typedef {Page} MyPage
 * @property getTextByX
 * @property closeSafe
 * @property error
 */

const writeFile = (location, data) => {
  try {
    fs.writeFileSync(location, JSON.stringify(data))
    console.log(`** WRITE TO FILE: ${location} -> SUCCESS **`)
  } catch (err) {
    console.log("File Write Error: " + err)
    process.exit(1)
  }
}

// want new tickers to update first when running update.js script
const randomOldDate = new Date(2000, 7, 24)
const newStockInfo = ticker => ({
  ticker,
  sector: "NEW_STOCKS",
  scrapeDataUpdatedAt: randomOldDate,
})

const readFile = location => {
  const file = fs.readFileSync(location)
  return JSON.parse(file)
}

const backupReturnStockDataFile = () => {
  // fs.copyFileSync(
  //   STOCK_DATA_BACKUP_LOCATION,
  //   `${SCRAPBOOK_LOCATION}/stockDataBackup_backup_${moment().format()}.json`
  // )
  // fs.copyFileSync(STOCK_DATA_LOCATION, STOCK_DATA_BACKUP_LOCATION)
  return readFile(STOCK_DATA_LOCATION)
}

const scrapbookWriteOut = (data, shouldMerge) => {
  /** @type {*} */
  const stockDataFile = fs.readFileSync(STOCK_DATA_LOCATION)
  const existingData = JSON.parse(stockDataFile)
  const writeToFile = shouldMerge
    ? assignWith(existingData, data, (a, b) => (isArray(a) ? a : { ...a, ...b }))
    : {
        ...existingData,
        ...data,
      }

  writeFile(STOCK_DATA_LOCATION, writeToFile)
  writeShortDatesToMeta(writeToFile)
}

const vooWriteOut = (data, shouldMerge) => {
  /** @type {*} */
  const stockDataFile = fs.readFileSync(VOO_LOCATION)
  const existingData = JSON.parse(stockDataFile)
  const writeToFile = shouldMerge
    ? assignWith({}, existingData, data, (a, b) => (isArray(a) ? b || a : { ...a, ...b }))
    : {
        ...existingData,
        ...data,
      }

  writeFile(VOO_LOCATION, writeToFile)
  // writeShortDatesToMeta(writeToFile)
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
    "https://invest.ameritrade.com/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/analystreports?symbol=USB&c_name=invest_VENDOR",
    "https://oltx.fidelity.com/ftgw/fbc/oftop/portfolio#summary",
    "https://www.moodys.com",
    "https://olui2.fs.ml.com/TFPHoldings/HoldingsByAccount.aspx?as_cd=1.4.2147483647.-1",
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

const makePrettyDate = () => moment().format("MMM DD h:mma")

const getOnlyStockTickerData = stockJsonData =>
  omit(stockJsonData, ["magicTickers", "buffetData", "earningsDates"])

const begin = () => {
  console.warn("********  Turn on PDF Viewer extension!!!! ********")
  exec("caffeinate")
}

const exit = () => {
  exec("killall caffeinate")
  console.log("🎉🎉 Scraping Complete: SUCCESS 🎉🎉")
  process.exit(0)
}

const formatMsDate = ms => new Date(ms).toLocaleString().split(",")[0]

class ReError extends Error {
  constructor(message, cause, funcName) {
    super(message, { cause })
    this.name = funcName ? `[${funcName}]` : ""
    this.nameLock = !!funcName
  }
}

class MessageError extends Error {
  constructor(message, funcName) {
    super(message)
    this.name = funcName ? `[${funcName}]` : ""
    this.nameLock = !!funcName

    Error.captureStackTrace(this, MessageError)
  }
}

module.exports = {
  // data manipulation
  makePrettyDate,
  formatMsDate,
  newStockInfo,
  // script
  exit,
  begin,
  promptForTickers,
  promptLogin,
  promptUser,
  pause,
  // write/read file
  writeFile,
  readFile,
  scrapbookWriteOut,
  vooWriteOut,
  backupReturnStockDataFile,
  getOnlyStockTickerData,
  // other
  ReError,
  MessageError,
}
