const { mapValues, pick } = require("lodash")
const { getOnlyStockTickerData, readFile, writeFile } = require("../util")

const currentData = readFile(STOCK_DATA_LOCATION)
const backupData = readFile(STOCK_DATA_BACKUP_LOCATION)

const stockData = getOnlyStockTickerData(currentData)

const newData = mapValues(stockData, tickerData => {
  const overwritesFromBackup = pick(backupData[tickerData.ticker], [
    "wsjChartThreeMonthAgo",
    "wsjChartMonthAgo",
    "wsjChartCurrent",
    "wsjChartCurrentNum",
    "wsjLastEarningsDate",
    "wsjNextEarningsDate",
  ])
  return { ...tickerData, ...overwritesFromBackup }
})

const writeOutData = { ...currentData, ...newData }
console.log(writeOutData)

// writeFile(STOCK_DATA_LOCATION, { ...currentData, ...newData })
//
// process.exit(0)
