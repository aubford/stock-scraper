const { scrapbookWriteOut, promptForTickers } = require("./util")

promptForTickers().then(promptRes => {
  const tickers = promptRes.split(/[^A-Z]/).filter(a => a)
  const toAdd = tickers.reduce(
    (acc, ticker) => ({
      [ticker]: {},
      ...acc,
    }),
    {}
  )
  scrapbookWriteOut(toAdd)
  process.exit(0)
})
