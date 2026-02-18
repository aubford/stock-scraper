const { slickCharts } = require("../sources")
const { metaWriteOut } = require("../util")
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
  const tickers = Object.keys(spWeights)

  fs.writeFileSync(`src/database/vooTickers.js`, `module.exports = ${JSON.stringify(tickers)}`)
  metaWriteOut({
    spWeights,
  })
}

module.exports = main
