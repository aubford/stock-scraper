const {
  argusAnalyst,
  cfra,
  morningstar,
  ford,
  tipranks,
  zacks,
  yahoo,
  wsj,
  newConstructs,
  moodys,
  street,
  td,
  boa,
  // fidelityStats,
  fidelityAnalysts,
} = require("./api")
const { makePrettyDate, scrapbookWriteOut, pause, writeFile } = require("./util")
const moment = require("moment")

const scrapeDataForTicker = async (ticker, browser) => {
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

  const [
    [moodysRating, moodysOutlook, moodysLink],
    yahooData,
    wsjData,
    ncData,
    cfraData,
  ] = await Promise.all([
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

const metaWriteBadFetches = badFetches => {
  /** @type {*} */
  const existingFile = fs.readFileSync(META_LOCATION)
  const existingMeta = JSON.parse(existingFile)

  writeFile(META_LOCATION, {
    ...existingMeta,
    badFetches: existingMeta.badFetches.concat({
      date: moment().format("MMM D YY: h:mm a"),
      tickers: badFetches,
    }),
  })
}

module.exports = async (allTickers, browser, shouldMerge) => {
  let badFetches = []
  const newStockData = {}

  const scrapeDataForTickers = async tickers => {
    console.log("Searching for tickers:", tickers)

    for (const ticker of tickers) {
      try {
        newStockData[ticker] = await scrapeDataForTicker(ticker, browser)
        console.log(`* TICKER COMPLETED OK: ${ticker}`)
      } catch (error) {
        console.log(`${ticker}: xxx FAIL xxx`, error)
        badFetches.push(ticker)
        newStockData[ticker] = { error }
      }
    }
  }

  await scrapeDataForTickers(allTickers)

  if (badFetches.length) {
    console.log(`Fetching badFetches: ${badFetches.join(", ")}`)

    await pause(30 * 1000)

    const refetchTickers = [...badFetches]
    badFetches = []

    await scrapeDataForTickers(refetchTickers)

    // if there are still bad fetches after second pass, log them in meta
    if (badFetches.length) {
      metaWriteBadFetches(badFetches)
    }
  }

  scrapbookWriteOut(newStockData, shouldMerge)
}
