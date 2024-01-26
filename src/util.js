const moment = require("moment")
const { isArray, assignWith } = require("lodash")
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
    console.log(`\n\n** WRITE TO FILE: ${location} -> SUCCESS **\n`)
  } catch (err) {
    console.log("\nFile Write Error: " + err + "\n")
    process.exit(1)
  }
}

// want new tickers to update first when running update.js script
const aubiesBurthday = new Date(1985, 7, 24)
const newStockInfo = ticker => ({
  ticker,
  sector: "NEW_STOCKS",
  scrapeDataUpdatedAt: aubiesBurthday,
})

const readFile = location => {
  const file = fs.readFileSync(location)
  return JSON.parse(/** @type string */ file)
}

const getStockDataFile = () => {
  return readFile(STOCK_DATA_LOCATION)
}

const getStockTickers = () => Object.keys(getStockDataFile())
const getVooTickers = () => require("./database/vooTickers")

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
}

const metaWriteOut = data => {
  /** @type {*} */
  const existingFile = fs.readFileSync(META_LOCATION)
  const existingMeta = JSON.parse(existingFile)

  writeFile(META_LOCATION, {
    ...existingMeta,
    ...data,
  })
}

const vooWriteOut = (data, shouldMerge) => {
  /** @type {*} */
  const vooDataFile = fs.readFileSync(VOO_LOCATION)
  const existingData = JSON.parse(vooDataFile)
  const writeToFile = shouldMerge
    ? assignWith({}, existingData, data, (a, b) => ({ ...a, ...b }))
    : {
        ...existingData,
        ...data,
      }

  writeFile(VOO_LOCATION, writeToFile)
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

// async
const promptForTickers = () => promptUser("Tickers: ")

const promptLogin = newPage => {
  const pages = [
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

/**
 * @returns {string}
 */
const makePrettyDate = () => moment().format("MMM DD h:mma")

const begin = () => {
  console.warn("********  Turn on PDF Viewer extension!!!! ********")
  exec("caffeinate")
}

/**
 * Success and close
 * @returns {void}
 */
const exit = async () => {
  exec("killall caffeinate")
  console.log(
    "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n",
    "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 Scraping Complete: SUCCESS 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n",
    "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n"
  )

  exec("afplay /System/Library/Sounds/Ping.aiff")
  await pause(1000)
  exec("afplay /System/Library/Sounds/Ping.aiff")

  process.exit(0)
}

const formatMsDate = ms => new Date(ms).toLocaleString().split(",")[0]

class ReError extends Error {
  /**
   * @param {string} message
   * @param {Error} cause
   * @param {string} [funcName]
   */
  constructor(message, cause, funcName) {
    super(message, { cause })
    this.name = funcName ? `( ${funcName} )` : ""
    this.code = cause.code
  }

  setCode(code) {
    this.code = code
    return this
  }
}

class MessageError extends Error {
  /**
   * @param {string} message
   * @param {string} [funcName]
   */
  constructor(message, funcName) {
    super(message)
    this.name = funcName ? `(${funcName} )` : ""
    this.code = null

    Error.captureStackTrace(this, MessageError)
  }

  setCode(code) {
    this.code = code
    return this
  }
}

class WarnError extends Error {
  /**
   * Error for passing through the promise chains to be caught but then
   * treated/logged as a warning instead of an error
   * @param {string} message
   * @param {string} funcName - enclosing function for context
   * @param {Error} [cause]
   */
  constructor(message, funcName, cause) {
    cause ? super(message, { cause }) : super(message)
    this.name = funcName ? `( ${funcName} )` : ""
    this.stack = ""
  }
}

/**
 * @param {Error} error
 * @param {string} ticker
 * @param {boolean} isDailyUpdate
 * @returns {import('./types').ErrorObject}
 */
const formatErrorObject = function (
  { name, message, stack, code } = {},
  ticker,
  isDailyUpdate
) {
  return {
    ...(ticker ? { ticker } : {}),
    [isDailyUpdate ? "duError" : "error"]: name ? name + ": " + message : message,

    [isDailyUpdate ? "duErrorCode" : "errorCode"]: code,
    [isDailyUpdate ? "duErrorStack" : "errorStack"]: stack,
  }
}

const clearErrors = () => ({
  error: "",
  errorCode: "",
  errorStack: "",
})

const getDiffPercent = (current, prior) => (current - prior) / Math.abs(prior)

const getEarningsPriceChange = (earningsDate, prices, pricesDates) => {
  if (!earningsDate || !prices || !isArray(pricesDates)) {
    return null
  }

  const earningsDateIndex = pricesDates.findIndex(date => {
    const dateA = new Date(date).toDateString()
    const dateB = new Date(earningsDate).toDateString()
    return dateA === dateB
  })

  return getDiffPercent(prices[earningsDateIndex - 1], prices[earningsDateIndex + 1])
}

const getNearestWeekDay = momentDate =>
  momentDate.day() === 0
    ? momentDate.subtract(2, "days")
    : momentDate.day() === 6
    ? momentDate.subtract(1, "days")
    : momentDate

const getQuarterDates = () => {
  const thisYearQuarterDates = ["09/30", "06/30", "03/31"].map(date =>
    getNearestWeekDay(moment(date, "MM/DD"))
  )
  const lastYearQuarterDates = ["12/31", "09/30"].map(date =>
    getNearestWeekDay(moment(date, "MM/DD").subtract(1, "year"))
  )
  return [...thisYearQuarterDates, ...lastYearQuarterDates]
}

const getPreviousQuarterStartEndDates = () => {
  const quarterDates = getQuarterDates()
  const now = moment()

  const prevQtrEndDate = quarterDates.find(date => date.isBefore(now))

  return {
    prevQtrEndDate,
    prevQtrStartDate: quarterDates[quarterDates.indexOf(prevQtrEndDate) + 1],
  }
}

const parseCommaFloat = str => parseFloat(str.replace(",", ""))

/**
 * From a response, get either JSON or HTML depending on content type
 * @param {Object} response
 * @returns {Promise<*>} - Returns a promise
 */
const getHtmlOrJson = response => {
  const contentType = response.headers()["content-type"]
  if (!contentType) {
    throw new WarnError(
      "No content type in response: Likely a provisional call",
      "getHtmlOrJson"
    )
  }

  if (contentType.includes("html")) {
    return response.text().catch(err => {
      throw new ReError("Problem getting text from response", err, "getHtmlOrJson")
    })
  }
  if (contentType.includes("json")) {
    return response.json().catch(err => {
      throw new ReError("Problem getting json from response", err, "getHtmlOrJson")
    })
  }

  throw new WarnError("not html or json", "getHtmlOrJson")
}

module.exports = {
  // data manipulation
  makePrettyDate,
  formatMsDate,
  newStockInfo,
  getDiffPercent,
  getEarningsPriceChange,
  getPreviousQuarterStartEndDates,
  parseCommaFloat,
  getHtmlOrJson,
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
  getStockDataFile,
  getStockTickers,
  getVooTickers,
  metaWriteOut,
  clearErrors,
  // error handling
  ReError,
  MessageError,
  WarnError,
  formatErrorObject,
}
