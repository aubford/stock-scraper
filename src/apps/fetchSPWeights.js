const { slickCharts } = require("../sources")
const { metaWriteOut, isValidTicker } = require("../util")
const fs = require("fs")

const main = async () => {
  console.log("fetching SP weights")
  const rawSpWeights = await slickCharts.fetch()
  // Clean tickers as keys of spWeights so all use cleaned tickers
  const spWeights = Object.fromEntries(
    Object.entries(rawSpWeights).map(([ticker, weight]) => {
      return [ticker.split(".")[0], weight]
    }),
  )
  const skipped = Object.keys(spWeights).filter(
    ticker => ticker === "BRK" || !isValidTicker(ticker),
  )
  if (skipped.length) {
    console.log("Skipping non-ticker SPY holdings:", skipped)
  }
  const tickers = Object.keys(spWeights).filter(
    ticker => ticker !== "BRK" && isValidTicker(ticker),
  )

  fs.writeFileSync(`src/database/vooTickers.js`, `module.exports = ${JSON.stringify(tickers)}`)
  metaWriteOut({
    spWeights,
  })
}

module.exports = main
