const { writeJsonFile, promptForTickers, getStockDataFile } = require("../util")
const showTickers = require("./showTickers")

// want new tickers to update first when running update.js script
const randomOldDate = new Date(2000, 7, 24)

module.exports = async () => {
  const tickers = await promptForTickers()
  const stockDataFile = getStockDataFile()
  const existingTickers = Object.keys(stockDataFile)

  const toAdd = tickers.reduce(
    (acc, ticker) => ({
      [ticker]: { sector: "NEW_STOCKS", scrapeDataUpdatedAt: randomOldDate, ticker },
      ...acc,
    }),
    {}
  )
  const newData = { ...toAdd, ...stockDataFile }

  const addedTickers = tickers.filter(ticker => !existingTickers.includes(ticker))
  const prunedTickers = existingTickers.filter(ticker => !tickers.includes(ticker))

  for (const ticker of prunedTickers) {
    delete newData[ticker]
  }

  if (addedTickers.length || prunedTickers.length) {
    writeJsonFile(STOCK_DATA_LOCATION, newData)
  }

  console.log("Added tickers: " + addedTickers.sort())
  console.log("Pruned tickers: " + prunedTickers.sort())
  console.log("New Tickers: ")
  showTickers()
}
