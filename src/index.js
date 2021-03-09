const puppeteer = require("puppeteer-core")
const { webSocketDebuggerUrl } = require("../ws.json")
const { getMoodysLink, fetchYahooData, fetchWSJData } = require("./api")
const buildCompanyData = require("./buildCompanyData")
const {
  evalX,
  newBrowserPage,
  parseStreetBulletData,
  prevSiblingTextIs,
  prevSiblingTextContains,
  followingSiblingTextIs,
  hasCFRA,
  writeOut,
  promptForTickers,
  promptLogin,
  extractNumbers,
} = require("./util")
const makeScrapeTools = require("./makeScrapeTools")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

puppeteer.connect(connection).then(async browser => {
  const newPage = (url, options) => newBrowserPage(browser, url, options)

  const closeLoginPages = await promptLogin(newPage)

  const promptResponse = await promptForTickers()
  const tickers = promptResponse.split(/[^A-Z]/)
  console.log("Searching for tickers:", tickers)

  closeLoginPages()

  const getFidelitySecretUrl = async fidelityLink => {
    if (!fidelityLink) {
      return null
    }
    const page = await newPage(fidelityLink)
    try {
      const src = await page.$eval("frame", node => node.getAttribute("src"))
      return `https://research2.fidelity.com/cgi-bin/upload.dll/${src}`
    } catch (err) {
      console.error("failed to getFidelitySecretUrl")
      return null
    } finally {
      await page.closeSafe()
    }
  }

  const newStockData = {}

  for (const ticker of tickers) {
    const { fetchPageData, fetchPdfData, fetchFidelityPageData, getPageCookies } = makeScrapeTools(
      ticker,
      browser
    )

    // FIDELITY

    const {
      values: [
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
      ] = [],
      page: fidelityPage,
    } = await fetchPageData({
      analystName: FIDELITY,
      url: `https://eresearch.fidelity.com/eresearch/goto/evaluate/analystsOpinions.jhtml?symbols=${ticker}`,
      xPathArr: [
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
      ],
    })

    const {
      [ARGUS_ANALYST_KEY]: { href: argusAnalystLinkHref, text: argusAnalystLinkText } = {},
      [ARGUS_RESEARCH_KEY]: { href: argusResearchLinkHref, text: argusResearchLinkText } = {},
      [ZACKS_KEY]: { href: zacksLinkHref, text: zacksLinkText } = {},
    } = await fetchFidelityPageData(fidelityPage, fidelityReportNameArr)

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

    // Pause every 5 tickers
    const tickerIndex = tickers.indexOf(ticker)
    if (tickerIndex !== 0 && tickerIndex % 5 === 0) {
      console.log("((pause))")
      await new Promise(resolve => setTimeout(resolve, PAUSE_MS))
    }

    // B of A

    const {
      values: [boaRating, [boaVolatility, boaInvestment, boaIncome] = []],
      page: boaPage,
    } = await fetchPageData({
      analystName: BOA,
      url: `https://olui2.fs.ml.com/RIStocksUI/RIStocksOverview.aspx?Symbol=${ticker}&ref=RUN_RIPortfolioStoryUI_PortfolioStory&src=ql`,
      xPathArr: [
        `//*[@id="mod_equityRatings"]/div[2]/div[1]/div[1]`,
        `//*[@id="mod_equityRatings"]//span[@class="fl ratingBlock ratingBlockActive"]`,
      ],
    })

    const morningstarLink = await evalX(
      boaPage,
      `//a[contains(@aria-label,"View latest Morningstar")]`,
      node => node.href
    )
    const cfraLink = await evalX(
      boaPage,
      `//a[contains(@aria-label,"View latest CFRA")]`,
      node => node.href
    )
    const [morningstarRating, cfraRating] = await evalX(
      boaPage,
      `//span[contains(@class,"morningStarRating")]`,
      node => node.getAttribute("aria-label")
    )

    if (boaPage) {
      await boaPage.closeSafe()
    }

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
      url: await getFidelitySecretUrl(argusAnalystLinkHref),
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
    const fetchMoodysData = async () => {
      if (moodysLink) {
        const { values, page } = await fetchPageData({
          waitForXpath: `//div[@class="mis-ratings-container"]`,
          url: `https://www.moodys.com${moodysLink.link}`,
          analystName: "moodys",
          xPathArr: [
            "//span[contains(text(),'LONG TERM RATING') or contains(text(),'LONG TERM DEBT')]/following-sibling::div[1]/a/div",
            "//span[contains(text(),'OUTLOOK')]/following-sibling::div[1]/a/div",
          ],
        })
        if (page) {
          await page.closeSafe()
        }
        return values ? values : ["", ""]
      }
      return ["", ""]
    }

    const [[moodysRating, moodysOutlook], yahooData, wsjData] = await Promise.all([
      fetchMoodysData(),
      fetchYahooData(ticker),
      fetchWSJData(ticker),
    ])
    const companyData = buildCompanyData(yahooData, wsjData)

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
      url: argusResearchLinkHref,
      xPathArr: [
        `//span[contains(text(),"Target ") and contains(text(),":")]/following-sibling::span[1]`,
        prevSiblingTextIs("Argus Rating:", 3),
        `//span[${xpathHelper}]/following-sibling::span[position()=1 and (${xpathHelper})]`,
      ],
    })

    // NEW CONSTRUCTS

    const [ncRating, [ncRatingB, ncRoic, ncFCF, ncEps, ncGap, ncPB]] = await fetchPdfData({
      analystName: NEW_CONSTRUCTS,
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        prevSiblingTextContains("(MM)"),
        `//span[text()="1 - Very Attractive" or text()="2 - Attractive" or text()="3 - Neutral"  or text()="4 - Unattractive" or text()="5 - Very Unattractive"]`,
      ],
      waitForPostScroll: `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]`,
    })

    if (ncRating !== ncRatingB) {
      throw new Error("*** NC Rating mismatch error !!!!")
    }

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

    const [
      zacksRank,
      zacksTarget,
      zacksRecommendation,
      zacksVGM,
      zacksValue,
      zacksGrowth,
      zacksMomentum,
      zacksIndustryRank,
    ] = await fetchPdfData({
      analystName: ZACKS,
      url: await getFidelitySecretUrl(zacksLinkHref),
      xPathArr: [
        `//span[text()="Zacks Style Scores:" or text()="Zacks Rank: "]/following-sibling::span[position()=1 and not(text()="(1-5)")]`,
        prevSiblingTextIs("Price Target (6-12 Months): "),
        prevSiblingTextIs("Zacks Recommendation:", 4),
        prevSiblingTextIs(`VGM:`),
        `//*[@id="viewer"]//span[contains(text(),"Value: ")]`,
        `//*[@id="viewer"]//span[contains(text(),"Growth: ")]`,
        `//*[@id="viewer"]//span[contains(text(),"Momentum: ")]`,
        prevSiblingTextIs(`Zacks Industry Rank`),
      ],
    })

    // RESULT

    const formatFidelityStarmine = (name, rating) => `${(name || "").substring(0, 14)} - ${rating}`
    newStockData[ticker] = {
      argusAnalystDate: argusAnalystLinkText,
      argusAnalystFinancialStrength,
      argusAnalystFiveYrEpsGrowth,
      argusAnalystLink: argusAnalystLinkHref,
      argusAnalystOneYrDivGrowth,
      argusAnalystOneYrEpsGrowth,
      argusAnalystRating,
      argusAnalystTarget,
      argusResearchDate: argusResearchLinkText,
      argusResearchFinancialStrength,
      argusResearchGrowth,
      argusResearchLink: argusResearchLinkHref,
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
      ncEps,
      ncFCF,
      ncGap,
      ncPB,
      ncRating,
      ncRoic,
      streetEfficiency,
      streetGrowth,
      streetIncome,
      ...parseStreetBulletData(streetBulletDataLineOne, streetBulletDataLineTwo),
      streetRating,
      streetSolvency,
      streetTargetPrice,
      streetTotalReturn,
      streetVolatility,
      zacksDate: zacksLinkText,
      zacksGrowth,
      zacksIndustryRank,
      zacksLink: zacksLinkHref,
      zacksMomentum,
      zacksRank,
      zacksRecommendation,
      zacksTarget,
      zacksVGM,
      zacksValue,
      ...companyData,
    }

    console.log(`* COMPLETED OK: ${ticker}`)
  }

  writeOut(newStockData)
})
