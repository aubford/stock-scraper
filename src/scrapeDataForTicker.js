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

  // ARGUS ANALYST & FORD & MORNINGSTAR

  const [zacksData, argusAnalystData, fordData, morningstarData, streetData, wsjData] =
    await Promise.all([
      zacks.fetch(ticker),
      argusAnalyst.fetch(ticker, browser, argusAnalystLink),
      ford.fetch(ticker, browser),
      morningstar.fetch(ticker, morningstarLink, browser),
      street.fetch(ticker, browser),
      wsj.fetch(ticker),
    ])

  // MULTI

  const [[moodysRating, moodysOutlook, moodysLink], yahooData, ncData, cfraData] =
    await Promise.all([
      moodys.fetch(ticker, browser),
      yahoo.fetch(ticker),
      newConstructs.fetch(ticker, browser),
      cfra.fetch(ticker, cfraRating, cfraLink, browser),
    ])

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
    ...fidelityAnalystOpinionsData,
    ...zacksData,
    ...fordData,
    ...tipData,
    ...cfraData,
    ...yahooData,
    ...wsjData,
  }
}
