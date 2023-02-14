const { promptForTickers, readFile, writeFile, newStockInfo } = require("../util")

const stockFile = readFile(VOO_LOCATION)

promptForTickers().then(promptRes => {
  const tickers = promptRes.split(/[^A-Z]/)
  const toAdd = tickers.reduce(
    (acc, ticker) => ({
      [ticker]: newStockInfo(ticker),
      ...acc,
    }),
    {}
  )
  writeFile(VOO_LOCATION, { ...stockFile, ...toAdd })
  process.exit(0)
})
