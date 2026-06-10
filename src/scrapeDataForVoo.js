const { yahoo, wsj, fidelityAnalysts, zacks, dataroma, marketBeat } = require("./sources")
const {
  vooStagingWriteOut,
  makePrettyDate,
  formatErrorObject,
  getEarningsPriceChange,
  clearErrors,
} = require("./util")

const scrapeDataForVoo = async (ticker, browser) => {
  console.log(`* STARTING: ${ticker}`)

  const fidelityAnalystOpinionsData = await fidelityAnalysts.fetch(ticker, browser)

  const [
    // yahooData,
    yahooHistoricalPricesData,
    wsjData,
    zacksData,
    dataromaData,
    marketBeatData,
  ] = await Promise.all([
    // yahoo.fetch(ticker),
    yahoo.fetchHistoricalPrices(ticker),
    wsj.fetch(ticker, browser),
    zacks.fetch(ticker, browser),
    dataroma.fetch(ticker),
    marketBeat.fetch(ticker),
  ])

  const { yahooDailyPricesDates, yahooDailyPrices } = yahooHistoricalPricesData
  const { morganStanleyRating: marketBeatMorganStanleyRating, ...marketBeatRest } =
    marketBeatData

  const morganStanleyRating =
    marketBeatMorganStanleyRating || fidelityAnalystOpinionsData.fidelityMorganStanleyRecommendation
  const earningsPriceChange = getEarningsPriceChange(
    zacksData.zacksLastEarningsDate,
    yahooDailyPrices,
    yahooDailyPricesDates
  )

  return {
    ...clearErrors(),
    earningsPriceChange,
    scrapeDataUpdatedAt: Date.now(),
    updatedAt: makePrettyDate(),
    ticker,
    tickerSearch: `//${ticker}`,
    ...marketBeatRest,
    ...fidelityAnalystOpinionsData,
    ...dataromaData,
    // ...yahooData,
    ...wsjData,
    ...zacksData,
    ...yahooHistoricalPricesData,
    morganStanleyRating,
  }
}

module.exports = async (allTickers, browser) => {
  await yahoo.fetchVooIndexHistoricalPrices(true)

  const scrapeDataForTickers = async tickers => {
    console.log("Searching for tickers:", tickers)

    for (const ticker of tickers) {
      try {
        const res = await scrapeDataForVoo(ticker, browser)
        vooStagingWriteOut({ [ticker]: res })
        console.log(`* TICKER COMPLETED OK: ${ticker}\n`)
      } catch (error) {
        vooStagingWriteOut({ [ticker]: formatErrorObject(error, ticker) })
        console.log(`${ticker}: xxx FAIL xxx`, error)
      }
    }
  }

  await scrapeDataForTickers(allTickers)
}
