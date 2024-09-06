/* eslint-disable */
require("./globalEnv")
const {
  getStockDataFile,
  readJsonFile,
  stagingWriteOut,
  scrapbookWriteOut,
} = require("./src/util")
const _ = require("lodash")
const { uniq, assignWith, omitBy, isEmpty } = require("lodash") // Add this at the top if not already present

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

/*
const errorEntries = _.pickBy(vooDataStaging["CARR"], (value, key) =>
  key.toLowerCase().includes('error')
)
*/

// Object.keys(stockData) /* ?+ */
const getDRKeys = data => {
  return Object.keys(data["AAPL"]).filter(key => key.includes("dataroma"))
}

const getDRKeysObj = obj => {
  return Object.keys(obj).filter(key => key.includes("dataroma"))
}
// Object.keys(stockDataStaging['AAPL']) /* ?+ */

const removeEmptyValues = obj =>
  omitBy(obj, (value, key) => isEmpty(value) && !key.includes("error"))

const writeOut = (fileLocation, data, shouldMerge) => {
  const existingContent = readJsonFile(fileLocation)

  getDRKeys(existingContent) /* ?+ */
  getDRKeys(data) /* ?+ */

  const newContent = true
    ? assignWith(existingContent, data, (objVal, srcVal) => {
        getDRKeysObj(srcVal) /* ?+ */
        const empty = removeEmptyValues(srcVal)
        return { ...objVal, ...empty }
      })
    : {
        ...existingContent,
        ...data,
      }

  getDRKeys(newContent) /* ?+ */

  return newContent

  // writeJsonFile(fileLocation, newContent)
}

getDRKeys(stockData)
getDRKeys(stockDataStaging)
getDRKeys(writeOut(STOCK_DATA_LOCATION, stockDataStaging, true))
