const { pickBy, omitBy, isEmpty, mapValues, uniq } = require("lodash")
const { readJsonFile, promptForYes, warnMissingCsvStockTickers } = require("../util")

const predicateSimple = (value, key) =>
  value && (key.includes("error_") || key.includes("warnError_"))

const predicateVerbose = (value, key) => value && key.toLowerCase().includes("error")

const errorsOnly = (stockData, predicate) => {
  const errorKeys = mapValues(stockData, ticker => pickBy(ticker, predicate))

  return omitBy(errorKeys, isEmpty)
}

const slcDate = date => date?.slice(0, 7)

const getUpdateDates = (data, key) => {
  const truncatedDates = data.map(stockData => slcDate(stockData[key])).filter(Boolean)
  const uniqueDates = uniq(truncatedDates)
  return uniqueDates.map(date => [date, truncatedDates.filter(d => d === date).length])
}

const logUpdates = (data, verbose) => {
  const values = Object.values(data)
  console.log("Updates:")
  console.log(getUpdateDates(values, "updatedAt"))
  console.log("Daily Updates:")
  console.log(getUpdateDates(values, "dailyUpdateAt"))
  console.log("Zacks Updates:")
  console.log(getUpdateDates(values, "zacksUpdatedAt"))

  if (verbose) {
    console.log("Fidelity Updates:")
    console.log(getUpdateDates(values, "fidelityAnalystsUpdatedAt"))
    console.log("CFRA Updates:")
    console.log(getUpdateDates(values, "cfraUpdatedAt"))
    console.log("WSJ Updates:")
    console.log(getUpdateDates(values, "wsjUpdatedAt"))

    values.forEach(
      ({
        ticker,
        updatedAt,
        dailyUpdateAt,
        zacksUpdatedAt,
        fidelityAnalystsUpdatedAt,
        cfraUpdatedAt,
        wsjUpdatedAt,
      }) => {
        const main = updatedAt ? slcDate(updatedAt) : "X"
        const daily = dailyUpdateAt ? slcDate(dailyUpdateAt) : "X"
        const zacks = zacksUpdatedAt ? slcDate(zacksUpdatedAt) : "X"
        const fidelity = fidelityAnalystsUpdatedAt
          ? ` fidelity: ${slcDate(fidelityAnalystsUpdatedAt)}`
          : ""
        const cfra = cfraUpdatedAt ? ` cfra: ${slcDate(cfraUpdatedAt)}` : ""
        const wsj = wsjUpdatedAt ? ` wsj: ${slcDate(wsjUpdatedAt)}` : ""

        console.log(
          `${ticker}: ${main}, daily: ${daily}, zacks:${zacks}` + wsj + fidelity + cfra,
        )
      },
    )
  }
}

const app = async skipPrompts => {
  console.log("🚀 Analysis 🚀")
  const committed = skipPrompts ? false : await promptForYes("Committed data?")
  const verbose = skipPrompts ? false : await promptForYes("Verbose?")
  const predicate = verbose ? predicateVerbose : predicateSimple

  warnMissingCsvStockTickers()

  console.log("⭐⭐⭐⭐⭐⭐️ StockDataStaging Errors:")
  const stockDataStaging = readJsonFile(committed ? STOCK_DATA_LOCATION : STOCK_DATA_STAGING)
  const stockDataStagingErrors = errorsOnly(stockDataStaging, predicate)
  console.log(JSON.stringify(stockDataStagingErrors, null, 2))
  console.log("\n")

  console.log("🌞🌞🌞🌞🌞🌞️ vooDataStaging Errors:")
  const vooDataStaging = readJsonFile(committed ? VOO_LOCATION : VOO_DATA_STAGING)
  const vooDataStagingErrors = errorsOnly(vooDataStaging, predicate)
  console.log(JSON.stringify(vooDataStagingErrors, null, 2))

  const stockDataValues = Object.values(stockDataStaging)
  const vooDataValues = Object.values(vooDataStaging)

  console.log("\n⭐⭐⭐⭐⭐⭐️ StockDataStaging Dates:")
  logUpdates(stockDataStaging, verbose)
  console.log("\n🌞🌞🌞🌞🌞🌞️ vooDataStating Dates:")
  logUpdates(vooDataStaging, verbose)
}

module.exports = app
