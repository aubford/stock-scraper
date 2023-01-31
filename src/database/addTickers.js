const { promptForTickers, readFile, writeFile } = require("../util")

// want new tickers to update first when running update.js script
const randomOldDate = new Date(2000, 7, 24)
const stockFile = readFile(STOCK_DATA_LOCATION)
const existingTickers = Object.keys(stockFile)

promptForTickers().then(promptRes => {
  const tickers = promptRes.split(/[^A-Z]/).filter(a => a && !existingTickers.includes(a))
  const toAdd = tickers.reduce(
    (acc, ticker) => ({
      [ticker]: { sector: "NEW_STOCKS", scrapeDataUpdatedAt: randomOldDate, ticker },
      ...acc,
    }),
    {}
  )
  writeFile(STOCK_DATA_LOCATION, { ...stockFile, ...toAdd })
  process.exit(0)
})
