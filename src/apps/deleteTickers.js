const { writeJsonFile, promptForTickers, getStockDataFile } = require("../util")
const showTickers = require("./showTickers")

module.exports = async () => {
  const tickers = await promptForTickers()
  const stockDataFile = getStockDataFile()

  Object.keys(stockDataFile).forEach(ticker => {
    if (tickers.includes(ticker)) {
      delete stockDataFile[ticker]
      console.log(`Deleted ${ticker}`)
    }
  })

  writeJsonFile(STOCK_DATA_LOCATION, stockDataFile)
  console.log("New Tickers: ")
  showTickers()
}
