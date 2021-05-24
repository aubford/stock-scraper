const { writeFile, promptForTickers, backupReturnStockDataFile } = require("./util")

promptForTickers().then(promptRes => {
  const tickers = promptRes.split(/[^A-Z]/).filter(a => a)
  const stockDataFile = backupReturnStockDataFile()
  for (const ticker of tickers) {
    if (!tickers.includes(ticker)) {
      delete stockDataFile[ticker]
    }
  }
  writeFile(STOCK_DATA_LOCATION, stockDataFile)
  process.exit(0)
})
