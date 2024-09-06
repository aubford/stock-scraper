const { writeJsonFile, promptForTickers, getStockDataFile, exit } = require("../util")
const showTickers = require("./showTickers")

module.exports = () =>
  promptForTickers().then(promptRes => {
    const tickers = promptRes.split(/[^A-Z]/).filter(a => a)
    const stockDataFile = getStockDataFile()
    for (const ticker in stockDataFile) {
      if (!tickers.includes(ticker)) {
        delete stockDataFile[ticker]
      }
    }
    writeJsonFile(STOCK_DATA_LOCATION, stockDataFile)
    console.log("New Tickers: ")
    showTickers()
    exit('Prune Tickers')
  })
