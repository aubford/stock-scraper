const {
  fidelityAnalysts,
  boa,
  argusAnalyst,
  morningstar,
  moodys,
  yahoo,
  wsj,
  cfra,
  zacks,
  dataroma,
  marketBeat,
} = require("./sources")
const { makePrettyDate, getEarningsPriceChange, clearErrors } = require("./util")

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<Object>}
 */
module.exports = async (ticker, browser) => {
  // FIDELITY

  const fidelityAnalystOpinionsData = await fidelityAnalysts.fetch(ticker, browser)
  const { argusAnalystLink } = fidelityAnalystOpinionsData

  // B of A

  const {
    boaRating,
    boaVolatility,
    boaIncome,
    boaInvestment,
    morningstarRating,
    morningstarLink,
    cfraRating,
    cfraLink,
  } = await boa.fetch(ticker, browser)

  const [
    yahooHistoricalPricesData,
    zacksData,
    argusAnalystData,
    dataromaData,
    marketBeatData,
  ] = await Promise.all([
    yahoo.fetchHistoricalPrices(ticker),
    zacks.fetch(ticker, browser),
    argusAnalyst.fetch(ticker, browser, argusAnalystLink),
    dataroma.fetch(ticker),
    marketBeat.fetch(ticker),
  ])

  const [wsjData, morningstarData] = await Promise.all([
    wsj.fetch(ticker, browser),
    morningstar.fetch(ticker, morningstarLink, browser),
  ])

  const cfraData = await cfra.fetch(ticker, cfraRating, cfraLink, browser)
  // const yahooData = await yahoo.fetch(ticker)

  const { yahooDailyPricesDates, yahooDailyPrices } = yahooHistoricalPricesData
  const {
    sector,
    marketBeatTargetsUpdatedAt,
    marketBeatTargets,
    marketBeatTargetsFormatted,
    marketBeatAnalystRatings,
    marketBeatAnalystRatingsFormatted,
    morganStanleyRating: marketBeatMorganStanleyRating,
  } = marketBeatData

  const morganStanleyRating =
    marketBeatMorganStanleyRating || fidelityAnalystOpinionsData.fidelityMorganStanleyRecommendation
  const earningsPriceChange = getEarningsPriceChange(
    zacksData.zacksLastEarningsDate,
    yahooDailyPrices,
    yahooDailyPricesDates
  )

  return {
    ...clearErrors(),
    ticker,
    tickerSearch: `//${ticker}`,
    scrapeDataUpdatedAt: Date.now(),
    updatedAt: makePrettyDate(),
    boaIncome,
    boaInvestment,
    boaRating,
    boaVolatility,
    cfraLink,
    cfraRating,
    morningstarLink,
    morningstarRating,
    morganStanleyRating,
    earningsPriceChange,
    sector,
    marketBeatTargetsUpdatedAt,
    marketBeatTargets,
    marketBeatTargetsFormatted,
    marketBeatAnalystRatings,
    marketBeatAnalystRatingsFormatted,
    ...morningstarData,
    ...argusAnalystData,
    ...fidelityAnalystOpinionsData,
    ...zacksData,
    ...cfraData,
    // ...yahooData,
    ...yahooHistoricalPricesData,
    ...wsjData,
    ...dataromaData,
  }
}
