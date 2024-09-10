const { promptForTickers, readJsonFile, writeJsonFile, exit } = require("../util")

// want new tickers to update first when running update.js script
const randomOldDate = new Date(2000, 7, 24)
const stockFile = readJsonFile(STOCK_DATA_LOCATION)

module.exports = async () => {
  const tickers = await promptForTickers()
  const toAdd = tickers.reduce(
    (acc, ticker) => ({
      [ticker]: { sector: "NEW_STOCKS", scrapeDataUpdatedAt: randomOldDate, ticker },
      ...acc,
    }),
    {}
  )

  const newData = { ...toAdd, ...stockFile }

  const addedTickers = Object.keys(newData).filter(
    ticker => !Object.keys(stockFile).includes(ticker)
  )
  console.log("Added tickers: " + addedTickers)

  if (addedTickers.length) {
    writeJsonFile(STOCK_DATA_LOCATION, newData)
  }

  exit("Add Tickers")
}
