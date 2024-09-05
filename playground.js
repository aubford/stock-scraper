/* eslint-disable */
require("./globalEnv")
const { getStockDataFile, readJsonFile } = require("./src/util")
const _ = require("lodash")
const { uniq } = require("lodash") // Add this at the top if not already present

const stockData = getStockDataFile()
const vooData = readJsonFile(VOO_LOCATION)
const stockDataStaging = readJsonFile(STOCK_DATA_STAGING)
const vooDataStaging = readJsonFile(VOO_DATA_STAGING)

const shortEntries = _.pickBy(vooDataStaging["CARR"], (value, key) =>
  key.toLowerCase().includes("short")
)




const getUpdateDates = data => {
  const truncatedDates = Object.values(data)
    .map(stockData => stockData.updatedAt.slice(0, 7))
    .filter(Boolean)

  const uniqueDates = uniq(truncatedDates)
  return uniqueDates.map(date => [date, truncatedDates.filter(d => d === date).length])
}

getUpdateDates(vooDataStaging) /* ?+ */

/*
const errorEntries = _.pickBy(vooDataStaging["CARR"], (value, key) =>
  key.toLowerCase().includes('error')
)
*/
