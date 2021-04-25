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

    // FORD

    const {
      fordEarningsStrength,
      fordRelativeValuation,
      fordPriceMovement,
      fordRating,
    } = await fetchFordData(ticker, scrapeTools)

    // PAUSE
    await pauseExecutionPerNTickers(ticker, tickers)

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

    // ARGUS ANALYST

    const argusAnalystData = await fetchArgusAnalyst(
      ticker,
      await getFidelitySecretUrl(argusAnalystLink, browser),
      scrapeTools
    )

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

    // MORNINGSTAR

    const [
      [morningstarFairValue] = [],
      morningstarMoat,
      morningstarUncertainty,
      morningstarCapitalAllocation,
      [morningstarDate] = [],
    ] = await fetchPdfData({
      analystName: MORNINGSTAR,
      url: morningstarLink,
      xPathArr: [
        prevSiblingTextIs("Capital Allocation", 4),
        followingSiblingTextIs("Price vs. Fair Value ", 4),
        followingSiblingTextIs("Price vs. Fair Value ", 2),
        followingSiblingTextIs("Price vs. Fair Value ", 1),
        prevSiblingTextIs("Capital Allocation", 6),
      ],
    })

    // MOODYS / YAHOO / WSJ

    const moodysCookies = await getPageCookies("https://www.moodys.com/")
    const moodysLink = await getMoodysLink(ticker, moodysCookies)

    const moodysFetcher = getPageDataFetcher("moodys", { timeout: 3 * 1000 })
    await moodysFetcher.setPage(
      moodysLink ? `https://www.moodys.com${moodysLink.link}` : null
    )

    const [
      [moodysRating, moodysOutlook],
      yahooData,
      wsjData,
      ncData,
      zacksSecretUrl,
      cfraData,
    ] = await Promise.all([
      moodysFetcher.fetchPageData(
        [
          "//span[contains(text(),'LONG TERM RATING') or contains(text(),'LONG TERM DEBT')]/following-sibling::div[1]/a/div",
          "//span[contains(text(),'OUTLOOK')]/following-sibling::div[1]/a/div",
        ],
        `//div[@class="mis-ratings-container"]`
      ),
      fetchYahooData(ticker),
      fetchWSJData(ticker),
      fetchNewConstructs(ticker, scrapeTools),
      getFidelitySecretUrl(zacksLink, browser),
      fetchCFRAData(ticker, cfraRating, cfraLink, scrapeTools),
    ])

    await moodysFetcher.close()

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
    })

    // ZACKS

    const zacksData = await fetchZacks(ticker, scrapeTools, zacksSecretUrl)

    // TIPRANKS

    const tipData = await fetchTipData(ticker, scrapeTools)

    // RESULT

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
      fordEarningsStrength,
      fordPriceMovement,
      fordRating,
      fordRelativeValuation,
      moodysLink: moodysLink ? moodysLink.link : "",
      moodysOutlook,
      moodysRating,
      morningstarCapitalAllocation,
      morningstarDate,
      morningstarFairValue,
      morningstarLink,
      morningstarMoat,
      morningstarRating,
      morningstarUncertainty,
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
      ...argusAnalystData,
      ...fidelityKeyStats,
      ...fidelityAnalystOpinionsData,
      ...zacksData,
      ...tipData,
      ...cfraData,
      ...buildCompanyData(yahooData, wsjData),
    }

    console.log(`* COMPLETED OK: ${ticker}`)
  }
  return newStockData
}
