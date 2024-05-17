const {
  yahoo,
  wsj,
  tipranks,
  fidelityAnalysts,
  moodys,
  zacks,
  dataroma,
} = require("./sources")
const {
  makePrettyDate,
  vooWriteOut,
  formatErrorObject,
  getEarningsPriceChange,
  clearErrors,
} = require("./util")

const scrapeDataForVoo = async (ticker, browser) => {
  console.log(`* STARTING: ${ticker}`)

  const fidelityAnalystOpinionsData = await fidelityAnalysts.fetch(ticker, browser)

  const [moodysData, yahooData, yahooHistoricalPricesData, wsjData, zacksData, tipData] =
    await Promise.all([
      moodys.fetch(ticker, browser),
      yahoo.fetch(ticker),
      yahoo.fetchHistoricalPrices(ticker),
      wsj.fetch(ticker, browser),
      zacks.fetch(ticker),
      tipranks.fetch(ticker, browser),
      dataroma.fetch(ticker),
    ])

  const { yahooDailyPricesDates, yahooDailyPrices } = yahooHistoricalPricesData
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
    ...moodysData,
    ...fidelityAnalystOpinionsData,
    ...tipData,
    ...yahooData,
    ...wsjData,
    ...zacksData,
    ...yahooHistoricalPricesData,
    morganStanleyRating:
      tipData.tipMorganStanleyRating ||
      fidelityAnalystOpinionsData.fidelityMorganStanleyRecommendation,
  }
}

module.exports = async (allTickers, browser, shouldMerge) => {
  await yahoo.fetchVooIndexHistoricalPrices(true)
  const newStockData = {}

  const scrapeDataForTickers = async tickers => {
    console.log("Searching for tickers:", tickers)

    for (const ticker of tickers) {
      try {
        newStockData[ticker] = await scrapeDataForVoo(ticker, browser)
        console.log(`* TICKER COMPLETED OK: ${ticker}`)
      } catch (error) {
        console.log(`${ticker}: xxx FAIL xxx`, error)
        newStockData[ticker] = formatErrorObject(error, ticker)
      }
    }
  }

  await scrapeDataForTickers(allTickers)
  vooWriteOut(newStockData, shouldMerge)
}
