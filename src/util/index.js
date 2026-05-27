const moment = require("moment")
const fs = require("fs")
const path = require("path")
const { isArray, assignWith, omitBy, isEmpty } = require("lodash")
const readline = require("readline")
const { exec } = require("child_process")
const open = require("open")
const vooTickers = require("../database/vooTickers")

/**
 * @typedef {Page} MyPage
 * @property getTextByX
 * @property closeSafe
 * @property error
 */

const writeJsonFile = (location, data) => {
  try {
    fs.writeFileSync(location, JSON.stringify(data))
    console.log(`\n\n** WRITE TO FILE: ${location} -> SUCCESS **\n`)
  } catch (err) {
    console.log("\nFile Write Error: " + err + "\n")
    process.exit(1)
  }
}

// want new tickers to update first when running update.js script
const aubsBirthday = new Date(1985, 7, 24)
const newStockInfo = ticker => ({
  ticker,
  sector: "NEW_STOCKS",
  scrapeDataUpdatedAt: aubsBirthday,
})

const readJsonFile = location => {
  if (!fs.existsSync(location)) {
    console.log(`File does not exist at ${location}`)
    return {}
  }

  const file = fs.readFileSync(location, { encoding: "utf8", flag: "r" })
  return JSON.parse(file)
}

// read stock data files /////////

const getStockDataFile = () => {
  return readJsonFile(STOCK_DATA_LOCATION)
}

/** @returns {string[]} */
const getStockTickers = () => Object.keys(getStockDataFile())
/** @returns {string[]} */
const getUnstagedStockTickers = () => {
  const allTickers = getStockTickers()
  const stagedStocks = readJsonFile(STOCK_DATA_STAGING)
  // filter out tickers that have an error
  const stagedTickers = Object.keys(stagedStocks).filter(ticker => !stagedStocks[ticker].error)
  return allTickers.filter(ticker => !stagedTickers.includes(ticker))
}
/** @returns {string[]} */
const getVooTickers = () => vooTickers
/** @returns {string[]} */
const getUnstagedVooTickers = () => {
  const allTickers = getVooTickers()
  const stagedStocks = readJsonFile(VOO_DATA_STAGING)
  // filter out tickers that have an error
  const stagedTickers = Object.keys(stagedStocks).filter(ticker => !stagedStocks[ticker].error)
  return allTickers.filter(ticker => !stagedTickers.includes(ticker))
}

// Determine if there are any tickers in stockDataMeta.myStocks (from Merill CSV) that are not in stockData.json
// return 1 if there are missing tickers, 0 if not for use in check-for-missing.js
const warnMissingCsvStockTickers = () => {
  const stockDataMeta = readJsonFile(META_LOCATION)
  const stockTickers = getStockTickers()
  const missingTickers = Object.keys(stockDataMeta.myStocks).filter(
    ticker => !stockTickers.includes(ticker) && !NO_FETCH_STOCKS.includes(ticker)
  )
  if (missingTickers.length) {
    console.log(
      "Missing stocks from stockData.json that exist in stockDataMeta.myStocks:",
      missingTickers
    )
    return 1
  } else {
    console.log("No missing stocks")
    return 0
  }
}

// write stock data files /////////

// Remove empty values so that we don't overwrite existing data with failed scrapes
const removeEmptyValues = obj =>
  omitBy(obj, (value, key) => isEmpty(value) && !key.includes("error"))

/**
 * Core write to file function
 * @param fileLocation
 * @param data
 * @param [shouldMerge]
 * @returns {void}
 */
const writeOut = (fileLocation, data, shouldMerge) => {
  const existingContent = readJsonFile(fileLocation)
  const newContent = shouldMerge
    ? assignWith(existingContent, data, (a, b) => ({ ...a, ...removeEmptyValues(b) }))
    : {
        ...existingContent,
        ...data,
      }

  writeJsonFile(fileLocation, newContent)
}

const deleteFile = (fileLocation, backup) => {
  try {
    if (backup) {
      const backupLocation = `${fileLocation.replace(".json", "")}_${moment()
        .format("MMM-DD")
        .toLowerCase()}.json`
      const backupDir = path.resolve(__dirname, "../../backups")
      const backupFileName = path.basename(backupLocation)
      const backupDestination = path.join(backupDir, backupFileName)

      fs.copyFileSync(fileLocation, backupLocation)
      fs.mkdirSync(backupDir, { recursive: true })
      fs.renameSync(backupLocation, backupDestination)
      console.log(`Created backup: ${backupLocation}`)
      console.log(`Moved backup to backups folder: ${backupDestination}`)
    }
    fs.unlinkSync(fileLocation)
    console.log(`Deleted file: ${fileLocation}`)
  } catch (error) {
    console.error(`Error deleting file: ${error.message}`)
    if (backup) {
      console.error(`Backup may not have been created.`)
    }
  }
}

const scrapbookWriteOut = (data, shouldMerge) =>
  writeOut(STOCK_DATA_LOCATION, data, shouldMerge)
const stagingWriteOut = (data, shouldMerge) => writeOut(STOCK_DATA_STAGING, data, shouldMerge)
const vooWriteOut = (data, shouldMerge) => writeOut(VOO_LOCATION, data, shouldMerge)
const vooStagingWriteOut = (data, shouldMerge) => writeOut(VOO_DATA_STAGING, data, shouldMerge)

const metaWriteOut = data => {
  /** @type {*} */
  const existingMeta = readJsonFile(META_LOCATION)

  writeJsonFile(META_LOCATION, {
    ...existingMeta,
    ...data,
  })
}

// general utils /////////

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

/** @returns {Promise<string[]>} */
const promptForTickers = async () => {
  const tickers = await promptUser("Tickers: ")
  return tickers.split(/\s+/).filter(a => a)
}

const promptLogin = newPage => {
  const pages = [
    "https://oltx.fidelity.com/ftgw/fbc/oftop/portfolio#summary",
    // "https://www.moodys.com",
    "https://olui2.fs.ml.com/TFPHoldings/HoldingsByAccount.aspx?as_cd=1.4.2147483647.-1",
  ].map(url => newPage(url, { waitUntil: "domcontentloaded" }))

  return () =>
    Promise.all(pages).then(pages =>
      pages.forEach(page => {
        page.closeSafe()
      })
    )
}

const promptForYes = async question => {
  const res = await promptUser(question + " (y/n): ")
  const lowerCaseRes = res.toLowerCase()
  return lowerCaseRes === "y" || lowerCaseRes === "yes"
}

const promptForVooAndStagingFileLocation = async () => {
  const isVoo = await promptForYes("VOO?")
  const isNotStaging = await promptForYes("Committed data?")

  if (isNotStaging) {
    return isVoo ? VOO_LOCATION : STOCK_DATA_LOCATION
  }
  return isVoo ? VOO_DATA_STAGING : STOCK_DATA_STAGING
}

const pause = async ms => {
  console.log(`** PAUSING FOR: ${ms}ms **`)
  return await new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * @returns {string}
 */
const makePrettyDate = () => moment().format("MMM DD h:mma")

const begin = () => {
  console.warn("********  Turn on PDF Viewer extension!!!! ********")
}

/**
 * Success and close
 * @returns {void}
 */
const exit = async name => {
  console.log(
    "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n",
    "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n",
    "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n",
    `🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉 Complete: ${name || "Success!"} 🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n`,
    "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n",
    "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n",
    "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉\n"
  )

  exec("afplay /System/Library/Sounds/Ping.aiff")
  await pause(1000)
  exec("afplay /System/Library/Sounds/Ping.aiff")

  console.log("**** DON'T FORGET TO COMMIT! ****")
  console.log("**** DON'T FORGET TO COMMIT! ****")
  console.log("**** DON'T FORGET TO COMMIT! ****")
}

const formatMsDate = ms => new Date(ms).toLocaleString().split(",")[0]

class ReError extends Error {
  /**
   * @param {string} message
   * @param {Error | Object} cause
   * @param {string} funcName
   */
  constructor(message, cause, funcName) {
    super(message, { cause })
    this.name = `( ${funcName} )`
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
   * @param {string} funcName
   */
  constructor(message, funcName) {
    super(message)
    this.name = `( ${funcName} )`
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
    this.name = `( ${funcName} )`
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

const getQuarterEndDates = () => {
  const thisYearQuarterDates = ["09/30", "06/30", "03/31"].map(date =>
    getNearestWeekDay(moment(date, "MM/DD"))
  )
  const lastYearQuarterDates = ["12/31", "09/30"].map(date =>
    getNearestWeekDay(moment(date, "MM/DD").subtract(1, "year"))
  )
  return [...thisYearQuarterDates, ...lastYearQuarterDates]
}

const getPreviousQuarterStartEndDates = () => {
  const quarterEndDates = getQuarterEndDates()
  const now = moment()

  const prevQtrEndDate = quarterEndDates.find(date => date.isBefore(now))

  return {
    prevQtrEndDate,
    prevQtrStartDate: quarterEndDates[quarterEndDates.indexOf(prevQtrEndDate) + 1],
  }
}

const parseCommaFloat = str => parseFloat(str.replace(",", ""))

/**
 * From a response, get either JSON or HTML depending on content type
 * @param {Object} response
 * @returns {Promise<*>} - Returns a promise
 */
// CDP errors that mean the body is gone (page closed / buffer evicted) — not real failures
const isBodyGoneErr = err => {
  const msg = err && err.message ? err.message : ""
  return (
    msg.includes("No data found for resource") ||
    msg.includes("Target closed") ||
    msg.includes("Session closed") ||
    msg.includes("Connection closed")
  )
}

const logBodyReadFailure = (kind, response, err) => {
  console.log(`getHtmlOrJson ${kind} read failed:`, {
    url: response.url ? response.url() : "?",
    status: response.status ? response.status() : "?",
    contentType: response.headers ? response.headers()["content-type"] : "?",
    name: err && err.name,
    message: err && err.message,
  })
}

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
      if (isBodyGoneErr(err)) {
        throw new WarnError(
          "Response body no longer available (likely intercepted too late): " + err.message,
          "getHtmlOrJson"
        )
      }
      logBodyReadFailure("text", response, err)
      throw new ReError("Problem getting text from response", err, "getHtmlOrJson")
    })
  }
  if (contentType.includes("json")) {
    return response.json().catch(err => {
      if (isBodyGoneErr(err)) {
        throw new WarnError(
          "Response body no longer available (likely intercepted too late): " + err.message,
          "getHtmlOrJson"
        )
      }
      logBodyReadFailure("json", response, err)
      throw new ReError("Problem getting json from response", err, "getHtmlOrJson")
    })
  }

  throw new WarnError("not html or json", "getHtmlOrJson")
}

const openInBrowser = url =>
  open(url, {
    app: { name: open.apps.edge },
  })

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
  promptForYes,
  promptForVooAndStagingFileLocation,
  pause,
  // write/read file
  writeJsonFile,
  readJsonFile,
  writeOut,
  deleteFile,
  scrapbookWriteOut,
  stagingWriteOut,
  vooWriteOut,
  vooStagingWriteOut,
  getStockDataFile,
  getStockTickers,
  getVooTickers,
  warnMissingCsvStockTickers,
  metaWriteOut,
  clearErrors,
  openInBrowser,
  getUnstagedStockTickers,
  getUnstagedVooTickers,
  // error handling
  ReError,
  MessageError,
  WarnError,
  formatErrorObject,
}
