const { writeJsonFile, promptForTickers, getStockDataFile } = require("../util")
const showTickers = require("./showTickers")

module.exports = async () => {
  const tickers = await promptForTickers()
  const stockDataFile = getStockDataFile()

  for (const ticker in stockDataFile) {
    if (!tickers.includes(ticker)) {
      delete stockDataFile[ticker]
    }
  }

  writeJsonFile(STOCK_DATA_LOCATION, stockDataFile)
  console.log("New Tickers: ")
  showTickers()
}
