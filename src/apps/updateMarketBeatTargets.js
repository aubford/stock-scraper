const { marketBeatTargets } = require("../sources")
const {
  stagingWriteOut,
  vooStagingWriteOut,
  getStockTickers,
  getVooTickers,
  promptUser,
  promptForYes,
  exit,
} = require("../util")

const parseTickers = text => text.split(/[^A-Z]/).filter(Boolean)

module.exports = async () => {
  console.log("🚀 Update MarketBeat Targets 🚀")

  const isVoo = await promptForYes("VOO?")
  const isSubset = await promptForYes("Subset?")
  let tickers = isVoo ? getVooTickers() : getStockTickers()

  if (isSubset) {
    const promptResponse = await promptUser("Tickers: ")
    tickers = parseTickers(promptResponse)
  }

  console.log("Searching for tickers:", tickers)

  for (const ticker of tickers) {
    console.log(`* STARTING: ${ticker}`)
    const data = await marketBeatTargets.fetch(ticker)
    const writeOut = isVoo ? vooStagingWriteOut : stagingWriteOut

    writeOut(
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

  await exit("updateMarketBeatTargets")
}
