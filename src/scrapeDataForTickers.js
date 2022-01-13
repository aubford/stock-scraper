const makeScrapeTools = require("./makeScrapeTools")
const {
  fetchZacks,
  fetchNewConstructs,
  fetchYahooData,
  fetchWSJData,
  fetchTipData,
  fetchFidelityKeyStats,
  fetchFidelityAnalystOpinions,
  fetchCFRAData,
  fetchFordData,
  fetchBoaData,
  fetchArgusAnalyst,
  fetchMorningstarData,
  fetchMoodysData,
  fetchTdData,
} = require("./api")
const buildCompanyData = require("./buildCompanyData")
const {
  parseStreetBulletData,
  getFidelitySecretUrl,
  prevSiblingTextIs,
  followingSiblingTextIs,
  makePrettyDate,
  scrapbookWriteOut,
  pause,
  writeFile,
} = require("./util")
const moment = require("moment")

const scrapeDataForTicker = async (ticker, browser) => {
  console.log(`* STARTING: ${ticker}`)

  const { fetchPdfData } = makeScrapeTools(ticker, browser)

  // TD Ameritrade

  const tdData = await fetchTdData(ticker, browser)

  // FIDELITY

  const fidelityAnalystOpinionsData = await fetchFidelityAnalystOpinions(ticker, browser)
  const fidelityKeyStats = await fetchFidelityKeyStats(ticker, browser)

  const { zacksLink, argusResearchLink, argusAnalystLink } = fidelityAnalystOpinionsData

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
  } = await fetchBoaData(ticker, browser)

  // ARGUS ANALYST & FORD & MORNINGSTAR

  const [argusAnalystData, fordData, morningstarData] = await Promise.all([
    fetchArgusAnalyst(
      ticker,
      await getFidelitySecretUrl(argusAnalystLink, browser, ticker),
      browser
    ),
    fetchFordData(ticker, browser),
    fetchMorningstarData(ticker, morningstarLink, browser),
  ])

  // THE STREET

  const [
    streetRating,
    streetGrowth,
    streetTotalReturn,
    streetEfficiency,
    streetVolatility,
    streetSolvency,
    streetIncome,
    streetBulletDataLineOne,
    streetBulletDataLineTwo,
    streetTargetPrice,
  ] = await fetchPdfData({
    analystName: THE_STREET,
    url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=20034&documenttag=${ticker}&c_name=invest_VENDOR`,
    xPathArr: [
      followingSiblingTextIs("RATING SINCE", 2), // 0 growth
      prevSiblingTextIs("Growth", 2), // 0 growth
      prevSiblingTextIs("Total Return", 2), // 1 total return
      prevSiblingTextIs("Efficiency", 2), // 2 efficiency
      prevSiblingTextIs("Price volatility", 2), // 3 price volatility
      prevSiblingTextIs("Solvency", 2), // 4 solvency
      prevSiblingTextIs("Income", 2), // 5 income
      `//span[contains(text(),'• ')]`, // 6 ...bullentPointData (lineOne)
      `//span[contains(text(),'• ')]/following-sibling::span[1]`, // 7 ...bulletPointData (lineTwo)
      `//span[text()='TARGET PRICE ']/following-sibling::span[1]`, // 8 target price
    ],
    //screenShotArr: [{ x: 344, y: 138, width: 468, height: 48 }],
    waitForPostScroll: "//span[contains(text(),'• ')]",
  })

  // MULTI

  const [
    [moodysRating, moodysOutlook, moodysLink],
    yahooData,
    wsjData,
    ncData,
    zacksSecretUrl,
    cfraData,
  ] = await Promise.all([
    fetchMoodysData(ticker, browser),
    fetchYahooData(ticker),
    fetchWSJData(ticker),
    fetchNewConstructs(ticker, browser),
    getFidelitySecretUrl(zacksLink, browser, ticker),
    fetchCFRAData(ticker, cfraRating, cfraLink, browser),
  ])

  // ARGUS RESEARCH

  const xpathHelper = `text()='M' or text()='H' or text()='L'`
  const [
    argusResearchTarget,
    argusResearchRating,
    [
      argusResearchManagement,
      argusResearchSafety,
      argusResearchFinancialStrength,
      argusResearchGrowth,
      argusResearchValue,
    ] = [],
  ] = await fetchPdfData({
    analystName: ARGUS_RESEARCH,
    url: argusResearchLink,
    xPathArr: [
      `//span[contains(text(),"Target ") and contains(text(),":")]/following-sibling::span[1]`,
      prevSiblingTextIs("Argus Rating:", 3),
      `//span[${xpathHelper}]/following-sibling::span[position()=1 and (${xpathHelper})]`,
    ],
    timeout: ARGUS_RESEARCH_TIMEOUT,
  })

  // ZACKS

  const zacksData = await fetchZacks(ticker, browser, zacksSecretUrl)

  // TIPRANKS

  const tipData = await fetchTipData(ticker, browser)

  return {
    scrapeDataUpdatedAt: Date.now(),
    updatedAt: makePrettyDate(),
    argusResearchFinancialStrength,
    argusResearchGrowth,
    argusResearchManagement,
    argusResearchRating,
    argusResearchSafety,
    argusResearchTarget,
    argusResearchValue,
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
    streetEfficiency,
    streetGrowth,
    streetIncome,
    streetRating,
    streetSolvency,
    streetTargetPrice,
    streetTotalReturn,
    streetVolatility,
    ticker,
    tickerSearch: `//${ticker}`,
    ...parseStreetBulletData(streetBulletDataLineOne, streetBulletDataLineTwo),
    ...ncData,
    ...morningstarData,
    ...argusAnalystData,
    ...fidelityKeyStats,
    ...fidelityAnalystOpinionsData,
    ...zacksData,
    ...fordData,
    ...tipData,
    ...cfraData,
    ...tdData,
    ...buildCompanyData(yahooData, wsjData),
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
