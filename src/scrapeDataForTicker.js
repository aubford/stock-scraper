const {
  fidelityAnalysts,
  boa,
  argusAnalyst,
  morningstar,
  moodys,
  yahoo,
  wsj,
  newConstructs,
  cfra,
  zacks,
  tipranks,
} = require("./sources")
const { makePrettyDate, getEarningsPriceChange, clearErrors } = require("./util")

module.exports = async (ticker, browser) => {
  // TIPRANKS

  const tipData = await tipranks.fetch(ticker, browser)

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

  // ARGUS ANALYST & MORNINGSTAR

  const [
    zacksData,
    argusAnalystData,
    morningstarData,
    wsjData,
    yahooHistoricalPricesData,
  ] = await Promise.all([
    zacks.fetch(ticker),
    argusAnalyst.fetch(ticker, browser, argusAnalystLink),
    morningstar.fetch(ticker, morningstarLink, browser),
    wsj.fetch(ticker),
    yahoo.fetchHistoricalPrices(ticker),
  ])

  // MULTI

  const [moodysData, yahooData, ncData, cfraData] = await Promise.all([
    moodys.fetch(ticker, browser),
    yahoo.fetch(ticker),
    newConstructs.fetch(ticker, browser),
    cfra.fetch(ticker, cfraRating, cfraLink, browser),
  ])

  const { yahooDailyPricesDates, yahooDailyPrices } = yahooHistoricalPricesData
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
    morganStanleyRating:
      tipData.tipMorganStanleyRating ||
      fidelityAnalystOpinionsData.fidelityMorganStanleyRecommendation,
    earningsPriceChange,
    ...moodysData,
    // ...streetData,
    ...ncData,
    ...morningstarData,
    ...argusAnalystData,
    ...fidelityAnalystOpinionsData,
    ...zacksData,
    ...tipData,
    ...cfraData,
    ...yahooData,
    ...yahooHistoricalPricesData,
    ...wsjData,
  }
}
