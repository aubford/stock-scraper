const { scrapbookWriteOut, promptForTickers } = require("./util")

// want new tickers to update first when running update.js script
const randomOldDate = new Date(2000, 7, 24)

promptForTickers().then(promptRes => {
  const tickers = promptRes.split(/[^A-Z]/).filter(a => a)
  const toAdd = tickers.reduce(
    (acc, ticker) => ({
      [ticker]: { sector: "NEW_STOCKS", scrapeDataUpdatedAt: randomOldDate },
      ...acc,
    }),
    {}
  )
  scrapbookWriteOut(toAdd)
  process.exit(0)
})
