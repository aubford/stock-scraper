const makeScrapeTools = require("./makeScrapeTools")
const {
  fetchZacks,
  fetchNewConstructs,
  getMoodysLink,
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
} = require("./api")
const buildCompanyData = require("./buildCompanyData")
const {
  parseStreetBulletData,
  getFidelitySecretUrl,
  prevSiblingTextIs,
  followingSiblingTextIs,
  pauseExecutionPerNTickers,
  makePrettyDate,
} = require("./util")

module.exports = async (tickers, browser) => {
  console.log("Searching for tickers:", tickers)

  const newStockData = {}
  for (const ticker of tickers) {
    console.log(`* STARTING: ${ticker}`)

    /** @type ScrapeTools */
    const scrapeTools = makeScrapeTools(ticker, browser)
    const { getPageDataFetcher, fetchPdfData, getPageCookies } = scrapeTools

    // FIDELITY
    const fidelityAnalystOpinionsData = await fetchFidelityAnalystOpinions(
      ticker,
      scrapeTools
    )
    const fidelityKeyStats = await fetchFidelityKeyStats(ticker, scrapeTools)

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
    } = await fetchBoaData(ticker, scrapeTools)

    // ARGUS ANALYST & FORD & MORNINGSTAR

    const [argusAnalystData, fordData, morningstarData] = await Promise.all([
      fetchArgusAnalyst(
        ticker,
        await getFidelitySecretUrl(argusAnalystLink, browser),
        scrapeTools
      ),
      fetchFordData(ticker, scrapeTools),
      fetchMorningstarData(ticker, morningstarLink, scrapeTools),
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

    // MOODYS / YAHOO / WSJ

    const moodysCookies = await getPageCookies("https://www.moodys.com/")
    const moodysLink = await getMoodysLink(ticker, moodysCookies)

    let moodysFetcher
    let moodysPromise = Promise.resolve([])
    if (moodysLink) {
      moodysFetcher = getPageDataFetcher("moodys", { timeout: 2 * 1000 })
      await moodysFetcher.setPage(
        moodysLink ? `https://www.moodys.com${moodysLink.link}` : null
      )
      moodysPromise = moodysFetcher.fetchPageData(
        [
          "//span[contains(text(),'LONG TERM RATING') or contains(text(),'LONG TERM DEBT')]/following-sibling::div[1]/a/div",
          "//span[contains(text(),'OUTLOOK')]/following-sibling::div[1]/a/div",
        ],
        `//div[@class="mis-ratings-container"]`
      )
      await moodysFetcher.close()
    } else {
      console.log(ticker + ": No Moodys Link")
    }

    const [
      [moodysRating, moodysOutlook],
      yahooData,
      wsjData,
      ncData,
      zacksSecretUrl,
      cfraData,
    ] = await Promise.all([
      moodysPromise,
      fetchYahooData(ticker),
      fetchWSJData(ticker),
      fetchNewConstructs(ticker, scrapeTools),
      getFidelitySecretUrl(zacksLink, browser),
      fetchCFRAData(ticker, cfraRating, cfraLink, scrapeTools),
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
      timeout: 10 * 1000,
    })

    // TIPRANKS

    const tipData = await fetchTipData(ticker, scrapeTools)

    // ZACKS

    const zacksData = await fetchZacks(ticker, scrapeTools, zacksSecretUrl)

    // ** RESULT **

    newStockData[ticker] = {
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
      moodysLink: moodysLink ? moodysLink.link : "",
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
      ...buildCompanyData(yahooData, wsjData),
    }

    console.log(`* COMPLETED OK: ${ticker}`)
  }
  return newStockData
}
