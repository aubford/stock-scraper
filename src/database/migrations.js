const { mapValues, pick } = require("lodash")
const { getOnlyStockTickerData, readFile, writeFile } = require("../util")

const currentData = readFile(STOCK_DATA_LOCATION)
const backupData = readFile(
  "/Users/aubrey/Google Drive/stock-scrapbook/stockDataBackup_has_wsj_all.json"
)

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

writeFile(STOCK_DATA_LOCATION, writeOutData)

process.exit(0)
