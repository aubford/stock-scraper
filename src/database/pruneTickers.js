const { writeFile, promptForTickers, getStockDataFile } = require("../util")

promptForTickers().then(promptRes => {
  const tickers = promptRes.split(/[^A-Z]/).filter(a => a)
  const stockDataFile = getStockDataFile()
  for (const ticker in stockDataFile) {
    if (!tickers.includes(ticker)) {
      delete stockDataFile[ticker]
    }
  }
  writeFile(STOCK_DATA_LOCATION, stockDataFile)
  process.exit(0)
})
