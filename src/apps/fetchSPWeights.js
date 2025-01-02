const { slickCharts } = require("../sources")
const { metaWriteOut } = require("../util")
const fs = require("fs")

const main = async () => {
  const spWeights = await slickCharts.fetch()
  const tickers = Object.keys(spWeights)

  fs.writeFileSync(
    `src/database/vooTickers.js`,
    `module.exports = ${JSON.stringify(tickers)}`
  )
  metaWriteOut({
    spWeights,
  })
}

module.exports = main
