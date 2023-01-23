const {
  td,
  fidelityAnalysts,
  boa,
  argusAnalyst,
  ford,
  morningstar,
  street,
  moodys,
  yahoo,
  wsj,
  newConstructs,
  cfra,
  zacks,
  tipranks,
} = require("./api")
const { makePrettyDate } = require("./util")

module.exports = async (ticker, browser) => {
  console.log(`* STARTING: ${ticker}`)

  // TD Ameritrade

  const tdData = await td.fetch(ticker, browser)

  // FIDELITY

  const fidelityAnalystOpinionsData = await fidelityAnalysts.fetch(ticker, browser)
  // const fidelityKeyStats = await fidelityStats.fetch(ticker, browser)

  const { zacksLink, argusAnalystLink } = fidelityAnalystOpinionsData

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

  // ARGUS ANALYST & FORD & MORNINGSTAR

  const [argusAnalystData, fordData, morningstarData, streetData] = await Promise.all([
    argusAnalyst.fetch(ticker, browser, argusAnalystLink),
    ford.fetch(ticker, browser),
    morningstar.fetch(ticker, morningstarLink, browser),
    street.fetch(ticker, browser),
  ])

  // MULTI

  const [[moodysRating, moodysOutlook, moodysLink], yahooData, wsjData, ncData, cfraData] =
    await Promise.all([
      moodys.fetch(ticker, browser),
      yahoo.fetch(ticker),
      wsj.fetch(ticker),
      newConstructs.fetch(ticker, browser),
      cfra.fetch(ticker, cfraRating, cfraLink, browser),
    ])

  // ZACKS

  const zacksData = await zacks.fetch(ticker, browser, zacksLink)

  // TIPRANKS

  const tipData = await tipranks.fetch(ticker, browser)

  return {
    scrapeDataUpdatedAt: Date.now(),
    updatedAt: makePrettyDate(),
    boaIncome,
    boaInvestment,
    boaRating,
    boaVolatility,
    cfraLink,
    cfraRating,
    moodysLink: moodysLink || "",
    moodysOutlook,
    moodysRating,
    morningstarLink,
    morningstarRating,
    ticker,
    tickerSearch: `//${ticker}`,
    ...streetData,
    ...ncData,
    ...morningstarData,
    ...argusAnalystData,
    // ...fidelityKeyStats,
    ...fidelityAnalystOpinionsData,
    ...zacksData,
    ...fordData,
    ...tipData,
    ...cfraData,
    ...tdData,
    ...yahooData,
    ...wsjData,
  }
}
