const { writeJsonFile, promptForTickers, getStockDataFile } = require("../util")

module.exports = () => promptForTickers().then(promptRes => {
  const tickers = promptRes.split(/[^A-Z]/).filter(a => a)
  const stockDataFile = getStockDataFile()
  for (const ticker in stockDataFile) {
    if (!tickers.includes(ticker)) {
      delete stockDataFile[ticker]
    }
  }
  writeJsonFile(STOCK_DATA_LOCATION, stockDataFile)
})
