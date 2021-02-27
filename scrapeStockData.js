const puppeteer = require("puppeteer-core")
const { webSocketDebuggerUrl } = require("./ws.json")
const _ = require("lodash")
const {
  evalX,
  newBrowserPage,
  parseStreetBulletData,
  prevSiblingTextIs,
  prevSiblingTextContains,
  followingSiblingTextIs,
  hasCFRA,
  writeOut,
  makeScrapeTools,
  getMoodysLink,
  extractNumbers,
  ARGUS_ANALYST_KEY,
  ARGUS_RESEARCH_KEY,
  ZACKS_KEY,
  FIDELITY,
  FORD,
  NEW_CONSTRUCTS,
  THE_STREET,
  ARGUS_ANALYST,
  ARGUS_RESEARCH,
  ZACKS,
  BOA,
  MORNINGSTAR,
  CFRA,
} = require("./util")
const readline = require("readline")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const promptForTickers = () =>
  new Promise(resolve => {
    readlineInterface.question("Tickers: ", tickers => {
      resolve(tickers)
      readlineInterface.close()
    })
  })

puppeteer.connect(connection).then(async browser => {
  const promptResponse = await promptForTickers()

  const tickers = promptResponse.split(/[^A-Z]/)
  console.log("Searching for tickers:", tickers)

  const newPage = (url, options) => newBrowserPage(browser, url, options)
  const getFidelitySecretUrl = async fidelityLink => {
    if (!fidelityLink) {
      return null
    }
    const page = await newPage(fidelityLink)
    const src = await page.$eval("frame", node => node.getAttribute("src"))
    await page.close()
    return `https://research2.fidelity.com/cgi-bin/upload.dll/${src}`
  }

  const newStockData = {}

  for (const ticker of tickers) {
    const {
      fetchPageData,
      fetchPdfData,
      fetchFidelityPageData,
      getPageCookies,
    } = makeScrapeTools(ticker, browser)

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
      [ARGUS_ANALYST_KEY]: {
        href: argusAnalystLinkHref,
        text: argusAnalystLinkText,
      } = {},
      [ARGUS_RESEARCH_KEY]: {
        href: argusResearchLinkHref,
        text: argusResearchLinkText,
      } = {},
      [ZACKS_KEY]: { href: zacksLinkHref, text: zacksLinkText } = {},
    } = await fetchFidelityPageData(fidelityPage, fidelityReportNameArr)

    // FORD

    const [
      fordEarningsStrength,
      fordRelativeValuation,
      fordPriceMovement,
      fordIndustryStrength,
    ] = await fetchPdfData({
      analystName: FORD,
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[36]`,
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[46]`,
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[53]`,
        prevSiblingTextContains(" performance is "),
      ],
      //screenShotArr: [{ x: 336, y: 175, width: 240, height: 36 }],
    })

    // short pause every 9 tickers
    const tickerIndex = tickers.indexOf(ticker)
    if (tickerIndex !== 0 && tickerIndex % 9 === 0) {
      console.log("((pause))")
      await new Promise(resolve => setTimeout(resolve, 3000))
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
      await boaPage.close()
    }

    // ARGUS ANALYST

    const [
      argusAnalystRating,
      argusAnalystTarget,
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

    // THE STREET

    const [
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

    // MOODYS

    const fetchMoodysData = async () => {
      const moodysCookies = await getPageCookies("https://www.moodys.com/")
      const moodysLink = await getMoodysLink(ticker, moodysCookies)

      if (moodysLink) {
        const { values, page } = await fetchPageData({
          url: `https://www.moodys.com${moodysLink.link}`,
          analystName: "moodys",
          xPathArr: [
            "//span[contains(text(),'OUTLOOK')]/following-sibling::div[1]/a/div",
            "//span[contains(text(),'LONG TERM RATING')]/following-sibling::div[1]/a/div",
          ],
        })
        if (page) {
          await page.close()
        }
        return values ? values : ["", ""]
      }
      return ["", ""]
    }

    const [moodysRating, moodysOutlook] = await fetchMoodysData()

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

    const [ncRating, ncEps, ncRoic, ncFCF, ncPB, ncGap] = await fetchPdfData({
      analystName: NEW_CONSTRUCTS,
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        prevSiblingTextContains("(MM)"), // rating
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[69]`, // eps
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[24]`, // roic
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[63]`, // fcf yield
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[181]`, // p/ebv
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]`, // growth appreciation period
      ],
      waitForPostScroll: `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]`,
    })

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

    newStockData[ticker] = {
      cfraLink,
      cfraTarget: extractNumbers(cfraTarget),
      cfraRating,
      cfraFairValue,
      cfraDate,
      morningstarLink,
      morningstarRating,
      morningstarFairValue,
      morningstarMoat,
      morningstarUncertainty,
      morningstarCapitalAllocation,
      morningstarDate,
      moodysOutlook,
      moodysRating,
      boaRating,
      boaIncome,
      boaInvestment,
      boaVolatility,
      fidelitySummaryScore: fidelitySummaryScore.trim(),
      fidelityStarmineOne: `${(fidelityStarmineOneName || "").substring(
        0,
        10
      )} - ${fidelityStarmineOneRating}`,
      fidelityStarmineTwo: `${(fidelityStarmineTwoName || "").substring(
        0,
        10
      )} - ${fidelityStarmineTwoRating}`,
      fidelityStarmineThree: `${(fidelityStarmineThreeName || "").substring(
        0,
        10
      )} - ${fidelityStarmineThreeRating}`,
      fidelityStarmineFour: `${(fidelityStarmineFourName || "").substring(
        0,
        10
      )} - ${fidelityStarmineFourRating}`,
      fidelityStarmineFive: `${(fidelityStarmineFiveName || "").substring(
        0,
        10
      )} - ${fidelityStarmineFiveRating}`,
      argusResearchLink: argusResearchLinkHref,
      argusResearchDate: argusResearchLinkText,
      argusResearchTarget,
      argusResearchRating,
      argusResearchManagement,
      argusResearchSafety,
      argusResearchFinancialStrength,
      argusResearchGrowth,
      argusResearchValue,
      argusAnalystLink: argusAnalystLinkHref,
      argusAnalystDate: argusAnalystLinkText,
      argusAnalystRating,
      argusAnalystTarget,
      argusAnalystFinancialStrength,
      argusAnalystOneYrEpsGrowth,
      argusAnalystFiveYrEpsGrowth,
      argusAnalystOneYrDivGrowth,
      zacksLink: zacksLinkHref,
      zacksDate: zacksLinkText,
      zacksTarget,
      zacksRecommendation,
      zacksRank,
      zacksVGM,
      zacksValue,
      zacksGrowth,
      zacksMomentum,
      zacksIndustryRank,
      fordEarningsStrength,
      fordRelativeValuation,
      fordPriceMovement,
      fordIndustryStrength,
      ncRating,
      ncEps,
      ncRoic,
      ncFCF,
      ncPB,
      ncGap,
      streetGrowth,
      streetTotalReturn,
      streetEfficiency,
      streetVolatility,
      streetSolvency,
      streetIncome,
      streetTargetPrice,
      ...parseStreetBulletData(streetBulletDataLineOne, streetBulletDataLineTwo),
    }

    console.log(`Completed OK: ${ticker}`)
  }

  writeOut(newStockData)
})
