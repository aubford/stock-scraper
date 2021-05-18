const { writeFile, promptForTickers, backupReturnStockDataFile } = require("./util")

promptForTickers().then(promptRes => {
  const tickers = promptRes.split(/[^A-Z]/).filter(a => a)
  const writeToFile = backupReturnStockDataFile()
  for (const ticker of tickers) {
    delete writeToFile[ticker]
  }
  writeFile(STOCK_DATA_LOCATION, writeToFile)
  process.exit(0)
})
