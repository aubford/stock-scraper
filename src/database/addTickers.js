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
  writeFile(STOCK_DATA_LOCATION, { ...stockFile, ...toAdd })
  process.exit(0)
})
