const {
  yahoo,
  wsj,
  fidelityAnalysts,
  zacks,
  dataroma,
  marketBeatTargets,
} = require("./sources")
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
    marketBeatTargetsData,
  ] = await Promise.all([
    // yahoo.fetch(ticker),
    yahoo.fetchHistoricalPrices(ticker),
    wsj.fetch(ticker, browser),
    zacks.fetch(ticker, browser),
    dataroma.fetch(ticker),
    marketBeatTargets.fetch(ticker),
  ])

  const { yahooDailyPricesDates, yahooDailyPrices } = yahooHistoricalPricesData
  const {
    marketBeatTargetsUpdatedAt,
    marketBeatTargets,
    marketBeatTargetsFormatted,
    marketBeatAnalystRatings,
    marketBeatAnalystRatingsFormatted,
  } = marketBeatTargetsData
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
    marketBeatTargetsUpdatedAt,
    marketBeatTargets,
    marketBeatTargetsFormatted,
    marketBeatAnalystRatings,
    marketBeatAnalystRatingsFormatted,
    ...fidelityAnalystOpinionsData,
    ...dataromaData,
    // ...yahooData,
    ...wsjData,
    ...zacksData,
    ...yahooHistoricalPricesData,
    morganStanleyRating: fidelityAnalystOpinionsData.fidelityMorganStanleyRecommendation,
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
