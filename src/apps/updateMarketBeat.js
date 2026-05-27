const { marketBeat } = require("../sources")
const { stagingWriteOut, getStockTickers, exit } = require("../util")

module.exports = async () => {
  console.log("🚀 Update MarketBeat 🚀")

  const tickers = getStockTickers()

  console.log("Searching for tickers:", tickers)

  for (const ticker of tickers) {
    console.log(`* STARTING: ${ticker}`)
    const data = await marketBeat.fetch(ticker)

    stagingWriteOut(
      {
        [ticker]: {
          ticker,
          ...data,
        },
      },
      true
    )
    console.log(`* TICKER COMPLETED OK: ${ticker}\n`)
  }

  await exit("updateMarketBeat")
}
