const puppeteer = require("puppeteer-core")
const makeScrapeTools = require("./makeScrapeTools")
const {
  fetchZacks,
  fetchNewConstructs,
  getMoodysLink,
  fetchYahooData,
  fetchWSJData,
  fetchFidelityKeyStats,
} = require("./api")
const buildCompanyData = require("./buildCompanyData")
const {
  newBrowserPage,
  parseStreetBulletData,
  getFidelitySecretUrl,
  prevSiblingTextIs,
  prevSiblingTextContains,
  followingSiblingTextIs,
  hasCFRA,
  writeOut,
  promptForTickers,
  promptLogin,
  pauseExecution,
  extractNumbers,
} = require("./util")

puppeteer.connect(CONNECTION).then(async browser => {
  const newPage = (url, options) => newBrowserPage(browser, url, options)

  const closeLoginPages = await promptLogin(newPage)

  const promptResponse = await promptForTickers()
  const tickers = promptResponse.split(/[^A-Z]/)
  console.log("Searching for tickers:", tickers)

  closeLoginPages()

  const newStockData = {}

  for (const ticker of tickers) {
    const scrapeTools = makeScrapeTools(ticker, browser)
    const { PageDataFetcher, fetchPdfData, getPageCookies } = scrapeTools

    // FIDELITY

    const fidelityFetcher = new PageDataFetcher(FIDELITY)
    await fidelityFetcher.setPage(
      `https://eresearch.fidelity.com/eresearch/goto/evaluate/analystsOpinions.jhtml?symbols=${ticker}`
    )
    const [
      fidelitySummaryScore,
      fidelityReportNameArr,
      fidelityStarmineOneName,
      fidelityStarmineTwoName,
      fidelityStarmineThreeName,
      fidelityStarmineFourName,
      fidelityStarmineFiveName,
      fidelityStarmineOneRating,
      fidelityStarmineTwoRating,
      fidelityStarmineThreeRating,
      fidelityStarmineFourRating,
      fidelityStarmineFiveRating,
    ] = await fidelityFetcher.fetchPageData([
      `//div[@class="sentiment-summary"]//span[@class="stock-sentiment"]`,
      `//table[@id="allOpinionsTable"]/tbody/tr/td[1]/span`,
      `//table[@id="sentSummaryTable"]/tbody/tr[1]/td[1]/span`,
      `//table[@id="sentSummaryTable"]/tbody/tr[2]/td[1]/span`,
      `//table[@id="sentSummaryTable"]/tbody/tr[3]/td[1]/span`,
      `//table[@id="sentSummaryTable"]/tbody/tr[4]/td[1]/span`,
      `//table[@id="sentSummaryTable"]/tbody/tr[5]/td[1]/span`,
      `//table[@id="sentSummaryTable"]/tbody/tr[1]/td[3]/span[@class="opinion"]`,
      `//table[@id="sentSummaryTable"]/tbody/tr[2]/td[3]/span[@class="opinion"]`,
      `//table[@id="sentSummaryTable"]/tbody/tr[3]/td[3]/span[@class="opinion"]`,
      `//table[@id="sentSummaryTable"]/tbody/tr[4]/td[3]/span[@class="opinion"]`,
      `//table[@id="sentSummaryTable"]/tbody/tr[5]/td[3]/span[@class="opinion"]`,
    ])

    const {
      zacksLink,
      argusResearchLink,
      argusAnalystLink,
      ...fidelityReportData
    } = await fidelityFetcher.fetchFidelityReportData(fidelityReportNameArr)

    await fidelityFetcher.close()

    const fidelityKeyStats = fetchFidelityKeyStats(ticker, { PageDataFetcher })

    // FORD

    const [
      fordRatingSentence = "",
      fordEarningsStrength,
      fordRelativeValuation,
      fordPriceMovement,
    ] = await fetchPdfData({
      analystName: FORD,
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        `//span[contains(text(),"We project that")]`,
        prevSiblingTextIs("Earnings Strength"),
        prevSiblingTextIs("Relative Valuation"),
        prevSiblingTextIs("Price Movement"),
      ],
    })

    const fordRating = fordRatingSentence
      ? [
          "will strongly outperform the market",
          "will outperform the market",
          "will perform in line with the market",
          "will underperform the market",
          "will strongly underperform the market",
        ].findIndex(str => fordRatingSentence.includes(str)) + 1 || "?"
      : ""

    // PAUSE
    await pauseExecution(ticker, tickers)

    // B of A

    const boaFetcher = new PageDataFetcher(BOA)
    await boaFetcher.setPage(
      `https://olui2.fs.ml.com/RIStocksUI/RIStocksOverview.aspx?Symbol=${ticker}&ref=RUN_RIPortfolioStoryUI_PortfolioStory&src=ql`
    )
    const [
      boaRating,
      [boaVolatility, boaInvestment, boaIncome] = [],
    ] = await boaFetcher.fetchPageData([
      `//*[@id="mod_equityRatings"]/div[2]/div[1]/div[1]`,
      `//*[@id="mod_equityRatings"]//span[@class="fl ratingBlock ratingBlockActive"]`,
    ])

    const morningstarLink = await boaFetcher.fetchHref(
      `//a[contains(@aria-label,"View latest Morningstar")]`
    )
    const cfraLink = await boaFetcher.fetchHref(
      `//a[contains(@aria-label,"View latest CFRA")]`
    )
    const [morningstarRating, cfraRating] = await boaFetcher.fetchAttribute(
      `//span[contains(@class,"morningStarRating")]`,
      "aria-label"
    )

    await boaFetcher.close()

    // ARGUS ANALYST

    const [
      argusAnalystRating,
      argusAnalystTargetStr,
      argusAnalystFinancialStrength,
      argusAnalystOneYrEpsGrowth,
      argusAnalystFiveYrEpsGrowth,
      argusAnalystOneYrDivGrowth,
    ] = await fetchPdfData({
      analystName: ARGUS_ANALYST,
      url: await getFidelitySecretUrl(argusAnalystLink, browser),
      xPathArr: [
        prevSiblingTextIs("ARGUS RATING: "),
        prevSiblingTextIs("Target Price"),
        prevSiblingTextIs("Financial Strength Rating"),
        prevSiblingTextIs("1 Year EPS Growth Forecast"),
        prevSiblingTextIs("5 Year EPS Growth Forecast"),
        prevSiblingTextIs("1 Year Dividend Growth Forecast"),
      ],
    })

    const argusAnalystTarget = argusAnalystTargetStr
      ? argusAnalystTargetStr.includes("Thousand")
        ? extractNumbers(argusAnalystTargetStr) * 1000
        : extractNumbers(argusAnalystTargetStr)
      : ""

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

    const moodysFetcher = new PageDataFetcher("moodys")
    await moodysFetcher.setPage(
      moodysLink ? `https://www.moodys.com${moodysLink.link}` : null
    )

    const [[moodysRating, moodysOutlook], yahooData, wsjData] = await Promise.all([
      moodysFetcher.fetchPageData(
        [
          "//span[contains(text(),'LONG TERM RATING') or contains(text(),'LONG TERM DEBT')]/following-sibling::div[1]/a/div",
          "//span[contains(text(),'OUTLOOK')]/following-sibling::div[1]/a/div",
        ],
        `//div[@class="mis-ratings-container"]`
      ),
      fetchYahooData(ticker),
      fetchWSJData(ticker),
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

    // NEW CONSTRUCTS

    const ncData = fetchNewConstructs(ticker, scrapeTools)

    // CFRA

    const [cfraTarget, cfraFairValue, cfraDate] = hasCFRA(cfraRating, ticker, "CFRA")
      ? await fetchPdfData({
          analystName: CFRA,
          url: cfraLink,
          xPathArr: [
            prevSiblingTextContains("12-Mo.  Target  Price"),
            prevSiblingTextContains("Calculation", 2),
            prevSiblingTextContains("Analysis prepared by", 3),
          ],
          waitForPostScroll: prevSiblingTextContains("Calculation", 2),
        })
      : []

    // ZACKS

    const zacksUrl = await getFidelitySecretUrl(zacksLink, browser)
    const zacksData = await fetchZacks(ticker, scrapeTools, zacksUrl)

    // RESULT

    const formatFidelityStarmine = (name, rating) =>
      `${(name || "").substring(0, 14)} - ${rating}`
    newStockData[ticker] = {
      argusAnalystFinancialStrength,
      argusAnalystFiveYrEpsGrowth,
      argusAnalystOneYrDivGrowth,
      argusAnalystOneYrEpsGrowth,
      argusAnalystRating,
      argusAnalystTarget,
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
      cfraDate,
      cfraFairValue,
      cfraLink,
      cfraRating,
      cfraTarget: extractNumbers(cfraTarget),
      fidelityStarmineFive: formatFidelityStarmine(
        fidelityStarmineFiveName,
        fidelityStarmineFiveRating
      ),
      fidelityStarmineFour: formatFidelityStarmine(
        fidelityStarmineFourName,
        fidelityStarmineFourRating
      ),
      fidelityStarmineOne: formatFidelityStarmine(
        fidelityStarmineOneName,
        fidelityStarmineOneRating
      ),
      fidelityStarmineThree: formatFidelityStarmine(
        fidelityStarmineThreeName,
        fidelityStarmineThreeRating
      ),
      fidelityStarmineTwo: formatFidelityStarmine(
        fidelityStarmineTwoName,
        fidelityStarmineTwoRating
      ),
      fidelitySummaryScore: fidelitySummaryScore ? fidelitySummaryScore.trim() : "",
      ...fidelityKeyStats,
      fordEarningsStrength,
      fordPriceMovement,
      fordRating,
      fordRelativeValuation,
      moodysLink,
      moodysOutlook,
      moodysRating,
      morningstarCapitalAllocation,
      morningstarDate,
      morningstarFairValue,
      morningstarLink,
      morningstarMoat,
      morningstarRating,
      morningstarUncertainty,
      ...ncData,
      streetEfficiency,
      streetGrowth,
      streetIncome,
      ...parseStreetBulletData(streetBulletDataLineOne, streetBulletDataLineTwo),
      streetRating,
      streetSolvency,
      streetTargetPrice,
      streetTotalReturn,
      streetVolatility,
      ...fidelityReportData,
      ...zacksData,
      ...buildCompanyData(yahooData, wsjData),
    }

    console.log(`* COMPLETED OK: ${ticker}`)
  }

  writeOut(newStockData)
})
