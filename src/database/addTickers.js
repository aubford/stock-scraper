const { promptForTickers, readFile, writeFile } = require("../util")

// want new tickers to update first when running update.js script
const randomOldDate = new Date(2000, 7, 24)
const stockFile = readFile(STOCK_DATA_LOCATION)

promptForTickers().then(promptRes => {
  const tickers = promptRes.split(/[^A-Z]/)
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
    writeFile(STOCK_DATA_LOCATION, newData)
  }

  process.exit(0)
})
