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
} = require("./sources")
const { makePrettyDate, getEarningsPriceChange, clearErrors } = require("./util")

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

  const [yahooHistoricalPricesData, zacksData, argusAnalystData, dataromaData] =
    await Promise.all([
      yahoo.fetchHistoricalPrices(ticker),
      zacks.fetch(ticker),
      argusAnalyst.fetch(ticker, browser, argusAnalystLink),
      dataroma.fetch(ticker),
    ])

  const [wsjData, morningstarData, yahooData] = await Promise.all([
    wsj.fetch(ticker, browser),
    morningstar.fetch(ticker, morningstarLink, browser),
    yahoo.fetch(ticker),
  ])

  // MULTI

  const [moodysData, cfraData] = await Promise.all([
    moodys.fetch(ticker, browser, yahooData.name),
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
    morganStanleyRating: fidelityAnalystOpinionsData.fidelityMorganStanleyRecommendation,
    earningsPriceChange,
    ...moodysData,
    ...morningstarData,
    ...argusAnalystData,
    ...fidelityAnalystOpinionsData,
    ...zacksData,
    ...cfraData,
    ...yahooData,
    ...yahooHistoricalPricesData,
    ...wsjData,
    ...dataromaData,
  }
}
