const { pickBy, omitBy, isEmpty, mapValues, uniq } = require("lodash")
const { readJsonFile, promptForYes } = require("../util")

const predicateSimple = (value, key) =>
  value && (key.includes("error_") || key.includes("warnError_"))

const predicateVerbose = (value, key) => value && key.toLowerCase().includes("error")

const errorsOnly = (stockData, predicate) => {
  const errorKeys = mapValues(stockData, ticker => pickBy(ticker, predicate))

  return omitBy(errorKeys, isEmpty)
}

const getUpdateDates = data => {
  const truncatedDates = Object.values(data)
    .map(stockData => stockData.updatedAt.slice(0, 7))
    .filter(Boolean)

  const uniqueDates = uniq(truncatedDates)
  return uniqueDates.map(date => [date, truncatedDates.filter(d => d === date).length])
}

const app = async skipPrompts => {
  console.log("🚀 Analysis 🚀")
  const verbose = skipPrompts ? false : await promptForYes("Verbose?")
  const predicate = verbose ? predicateVerbose : predicateSimple

  console.log("⭐⭐⭐⭐⭐⭐️ StockDataStaging Errors:")
  const stockDataStaging = readJsonFile(STOCK_DATA_STAGING)
  const stockDataStagingErrors = errorsOnly(stockDataStaging, predicate)
  console.log(JSON.stringify(stockDataStagingErrors, null, 2))
  console.log("\n")

  console.log("🌞🌞🌞🌞🌞🌞️ VOO Data Staging Errors:")
  const vooDataStaging = readJsonFile(VOO_DATA_STAGING)
  const vooDataStagingErrors = errorsOnly(vooDataStaging, predicate)
  console.log(JSON.stringify(vooDataStagingErrors, null, 2))

  console.log("\n⭐⭐⭐⭐⭐⭐️ StockDataStaging Update Dates:")
  const stockDataStagingUpdateDates = getUpdateDates(stockDataStaging)
  console.log(stockDataStagingUpdateDates)

  console.log("\n🌞🌞🌞🌞🌞🌞️ VOO Data Staging Update Dates:")
  const vooDataStagingUpdateDates = getUpdateDates(vooDataStaging)
  console.log(vooDataStagingUpdateDates)

  return {
    stockDataStagingErrors,
    vooDataStagingErrors,
    stockDataStagingUpdateDates,
    vooDataStagingUpdateDates,
  }
}

module.exports = app
