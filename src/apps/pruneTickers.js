const { writeJsonFile, promptForTickers, getStockDataFile } = require("../util")
const showTickers = require("./showTickers")

module.exports = async () => {
  const tickers = await promptForTickers()
  const stockDataFile = getStockDataFile()

  const prunedTickers = []
  for (const ticker in stockDataFile) {
    if (!tickers.includes(ticker)) {
      delete stockDataFile[ticker]
      prunedTickers.push(ticker)
    }
  }

  writeJsonFile(STOCK_DATA_LOCATION, stockDataFile)
  console.log("Pruned tickers: " + prunedTickers.sort())
  console.log("New Tickers: ")
  showTickers()
}
