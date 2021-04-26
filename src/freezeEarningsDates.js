const { fromPairs } = require("lodash")
const { writeFile, getOnlyStockTickerData, backupReturnStockDataFile } = require("./util")

const existingData = backupReturnStockDataFile()
const stockData = getOnlyStockTickerData(existingData)

const pairs = Object.values(stockData).map(({ ticker, earningsDates }) => [
  ticker,
  earningsDates,
])

const writeToFile = {
  ...existingData,
  earningsDates: { ...fromPairs(pairs), ...existingData.earningsDates },
}

writeFile(STOCK_DATA_LOCATION, writeToFile)
