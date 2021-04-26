const Cheerio = require("cheerio")
const { chunk, zip, mapValues, isString, flatten } = require("lodash")
const {
  getFirstLastValue,
  prevSiblingTextContains,
  followingSiblingTextIs,
  prevSiblingTextIs,
  millBillStrToNum,
  hasCFRA,
  extractNumbers,
  makePrettyDate,
} = require("./util")

const cleanFidelityStrings = val =>
  isString(val)
    ? val
        .replace("+", "")
        .replace("th", "")
        .replace("rd", "")
        .replace("nd", "")
        .replace("st", "")
    : val

/**
 * @returns {Promise<string>}
 */
const fetchText = async (...fetchArgs) => {
  const response = await fetch(...fetchArgs)
  return await response.text()
}

const hedgeFundValues = [
  { first: "warren", last: "buffett", value: 5 },
  { first: "daniel", last: "loeb", value: 5 },
  { first: "meridian", last: "", value: 5 },
  { first: "david", last: "tepper", value: 5 },
  { first: "chuck", last: "akre", value: 5 },
  { first: "prem", last: "watsa", value: 5 },
  { first: "frank", last: "sands", value: 5 },
  { first: "ron", last: "baron", value: 5 },
  { first: "cedar", last: "rock", value: 4 },
  { first: "andy", last: "brown", value: 4 }, // cedar rock
  { first: "andrew", last: "brown", value: 4 }, // cedar rock
  { first: "brad", last: "gerstner", value: 4 },
  { first: "philippe", last: "laffont", value: 4 },
  { first: "david", last: "blood", value: 4 },
  { first: "steve", last: "mandel", value: 4 },
  { first: "eagle", last: "capital", value: 4 }, // eagle capital
  { first: "boykin", last: "curry", value: 4 }, // eagle capital
  { first: "chase", last: "coleman", value: 4 },
  { first: "lee", last: "ainslie", value: 4 },
  { first: "", last: "chilton", value: 4 },
  { first: "george", last: "soros", value: 4 },
  { first: "bill", last: "ackman", value: 4 },
  { first: "fairholme", last: "", value: 4 }, // fairholme
  { first: "bruce", last: "berkowitz", value: 4 }, // fairholme
  { first: "vanguard", last: "health", value: 4 }, // vanguard health
  { first: "edward", last: "owens", value: 4 }, // vanguard health
  { first: "cathie", last: "wood", value: 4 }, // cathie wood
  { first: "catherine", last: "wood", value: 4 }, // cathie wood
  { first: "sequoia", last: "", value: 4 }, // sequoia
  { first: "ruane", last: "cunniff", value: 4 }, // sequoia
  { first: "primecap", last: "", value: 4 },
  { first: "nuveen", last: "", value: 4 },
  { first: "tom", last: "russo", value: 4 },
  { first: "david", last: "rolfe", value: 4 },
  { first: "chuck", last: "royce", value: 4 },
  { first: "harbor", last: "capital", value: 4 }, // harbor capital
  { first: "spiros", last: "segalas", value: 4 }, // harbor capital
  { first: "elfun", last: "", value: 4 },
  { first: "parnassus", last: "endeavor", value: 4 },
  { first: "manning", last: "napier", value: 4 },
  { first: "night", last: "owl", value: 3 }, // night owl
  { first: "john", last: "kim", value: 3 }, // night owl
  { first: "steven", last: "mandel", value: 3 }, // match
  { first: "christopher", last: "lord", value: 3 },
  { first: "alok", last: "agrawal", value: 3 },
  { first: "william", last: "duhamel", value: 3 },
  { first: "zhang", last: "lei", value: 3 },
  { first: "steven", last: "romick", value: 3 },
  { first: "edgar", last: "wchenheim", value: 3 },
  { first: "pasco", last: "alfaro", value: 3 },
  { first: "ray", last: "dalio", value: 3 },
  { first: "mario", last: "gabelli", value: 3 },
  { first: "robert", last: "rodriguez", value: 3 },
  { first: "can-am", last: "small", value: 3 },
  { first: "bill", last: "nygren", value: 3 },
  { first: "jeff", last: "auxier", value: 3 },
  { first: "ian", last: "cumming", value: 3 },
  { first: "tom", last: "gayner", value: 3 },
  { first: "donald", last: "yacktman", value: 3 },
  { first: "jerome", last: "dodson", value: 3 },
  { first: "hennessy", last: "japan", value: 3 },
  { first: "seth", last: "klarman", value: 3 },
  { first: "arthur", last: "cohen", value: 2 },
  { first: "joel", last: "greenblatt", value: 2 },
  { first: "westport", last: "asset", value: 2 },
  { first: "diamond", last: "hill", value: 2 },
  { first: "ken", last: "heebner", value: 2 }, // more research needed
  { first: "john", last: "paulson", value: 2 },
  { first: "ken", last: "fisher", value: 2 },
  { first: "leith", last: "wheeler", value: 2 },
  { first: "murray", last: "stahl", value: 2 },
  { first: "ted", last: "kang", value: 2 },
  { first: "james", last: "barrow", value: 2 },
  { first: "", last: "eveillard", value: 3 },
  { first: "bill", last: "frels", value: 2 },
  { first: "richard", last: "snow", value: 2 },
  { first: "chris", last: "davis", value: 2 },
  { first: "wallace", last: "weitz", value: 2 },
  { first: "brian", last: "rogers", value: 2 },
  { first: "ronald", last: "muhlenkamp", value: 2 },
  { first: "john", last: "keeley", value: 2 },
  { first: "arnold", last: "schneider", value: 2 },
  { first: "dodge", last: "cox", value: 2 },
  { first: "robert", last: "olstein", value: 2 },
  { first: "john", last: "buckingham", value: 2 },
  { first: "robert", last: "bruce", value: 2 },
  { first: "john", last: "rogers", value: 2 },
  { first: "tweedy", last: "browne", value: 1 },
  { first: "martin", last: "whitman", value: 1 },
  { first: "mason", last: "hawkins", value: 1 },
  { first: "john", last: "hussman", value: 1 },
  { first: "jeremy", last: "grantham", value: 1 },
  { first: "charles", last: "brandes", value: 1 },
  { first: "francis", last: "chou", value: 1 },
  { first: "louis", last: "bacon", value: 1 },
]

exports.fetchFordData = async (ticker, { fetchPdfData }) => {
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

  return { fordRating, fordRelativeValuation, fordEarningsStrength, fordPriceMovement }
}

const getHedgeRating = tipHedgeMoves => {
  const getChangePct = str => Number(str.split(", ")[1].split(" ")[0].replace("%", ""))
  const getMovementValue = movement => {
    const sellThreshold = -1.5,
      sellVal = -1,
      rebalanceVal = -0.25,
      holdVal = 0.5,
      buyVal = 1
    const getNegativeVal = num => (num < sellThreshold ? sellVal : rebalanceVal)
    const getPositiveVal = num => (num === 0 ? holdVal : buyVal)
    return movement >= 0 ? getPositiveVal(movement) : getNegativeVal(movement)
  }

  return chunk(tipHedgeMoves.split("\n"), 2)
    .map(([name, move]) => [name, getChangePct(move)])
    .reduce((sum, [hedgeName, movement]) => {
      const mapData = hedgeFundValues.find(({ first, last }) => {
        const lowerName = hedgeName.toLowerCase()
        return lowerName.includes(first) && lowerName.includes(last)
      })
      const hedgeCoeff = mapData ? mapData.value : 1

      return sum + getMovementValue(movement) * hedgeCoeff
    }, 0)
}
/**
 * @param ticker
 * @param {ScrapeTools} getPageDataFetcher
 * @returns {Promise<Object>}
 */
exports.fetchTipData = async (ticker, { getPageDataFetcher }) => {
  /** @type PageDataFetcher */
  const fetcher = getPageDataFetcher(TIPRANKS)
  const setOk = await fetcher.setPageTrPopup()
  if (!setOk) {
    await fetcher.close()
    return {}
  }

  const [
    tipScore = "",
    [
      tipAnalystRatings = "",
      tipInsiderActivity = "",
      tipHedgeActivity = "",
      tipNewSent = "",
      tipBloggers = "",
      tipInvestors = "",
      tipTechnicals = "",
      tipMomentum = "",
      tipROE = "",
      tipAssetGrowth = "",
    ] = [],
    tipTargetStr,
  ] = await fetcher.fetchPageData([
    `//span[@class="single-bar-internal-score selected"]`,
    `//div[@class="tipranks-smart-score-factors-container"]//div[contains(@class,"sub-factor-single-value")]`,
    `//span[@class="sub-factor-single-info"][contains(text(),"Average price target")]`,
  ])

  // Analysts
  await fetcher.click(
    `div.tipranks-top-row > .tipranks-widget section[aria-label="Analyst Ratings"] > div > span > button`
  )
  await fetcher.waitForXpath(`//table[@id="tipranks-analyst-ratings"]/tbody/tr`)
  await fetcher.clickWhile(`button[data-test-id="tipranksanalystratings_showmore"]`)
  const analystStrings = await fetcher.fetchPageData([
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr/th/div/div/button/span`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="converted-target-price"]`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="stock-rating"]`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="analyst-action"]`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="latest-report"]`,
  ])

  const tipAnalysts = zip(...analystStrings).join("\n")

  // Investors
  await fetcher.click(
    `div.tipranks-top-row > .tipranks-widget section[aria-label="Investor Sentiment"] > div > span > button`
  )
  const [
    [tipYoungHolders, tipMidageHolders, tipOldHolders] = [],
  ] = await fetcher.fetchPageData([`//p[@class="age-group-box-bigNum holders"]`])

  // Bloggers
  const shouldGetBloggers = tipBloggers !== "N/A"
  if (shouldGetBloggers) {
    await fetcher.click(
      `div.tipranks-top-row > .tipranks-widget section[aria-label="Blogger Opinions"] > div > span > button`
    )
  }
  const [tipBlogArticleDates] = shouldGetBloggers
    ? await fetcher.fetchPageData([
        `//table[@id="tipranks-blogger-table"]/tbody/tr/td/span[@data-test-id="date-cell"]`,
      ])
    : []
  const tipBlogArticles = shouldGetBloggers
    ? await fetcher.fetchHref(`//table[@id="tipranks-blogger-table"]/tbody/tr/td/a`)
    : []

  // HEDGE FUNDS
  const shouldGetHedgeActivity = tipHedgeActivity !== "N/A"
  if (shouldGetHedgeActivity) {
    await fetcher.click(
      `div.tipranks-top-row > .tipranks-widget section[aria-label="Hedge Fund Activity"] > div > span > button`
    )
    await fetcher.waitForXpath(`//table[@id="tipranks-hedge-fund-activity"]/tbody/tr`)
    await fetcher.clickWhile(`button[data-test-id="hedgefundactivity_showmore"]`)
  }
  const [tipHedgeStrings] = shouldGetHedgeActivity
    ? await fetcher.fetchPageData([
        `//table[@id="tipranks-hedge-fund-activity"]/tbody/tr`,
      ])
    : []
  const tipHedgeMoves =
    shouldGetHedgeActivity && tipHedgeStrings
      ? []
          .concat(tipHedgeStrings)
          .map(str => {
            const trimmed = str.replace("hedgeFundManagerName", "")
            const splitName = trimmed.split("action")
            const splitAction = splitName[1].split("holdingChange")
            const splitHoldingChange = splitAction[1].split("valueReported")
            const splitPctPortfolio = splitHoldingChange[1].split("percentageOfPortfolio")

            return `${splitName[0]}\n[${splitAction[0].toUpperCase()}, ${
              splitHoldingChange[0]
            } -> ${splitPctPortfolio[1]}]`
          })
          .join("\n")
      : ""

  const tipHedgeRating =
    shouldGetHedgeActivity && tipHedgeMoves ? getHedgeRating(tipHedgeMoves) : ""

  // Insiders
  const shouldGetInsiders = tipInsiderActivity !== "N/A"
  if (shouldGetInsiders) {
    await fetcher.click(
      `div.tipranks-top-row > .tipranks-widget section[aria-label="Corporate Insider Activity"] > div > span > button`
    )
    await fetcher.waitForXpath(
      `//table[@id="tipranks-insider-activity"]/tbody/tr/td/div[@data-test-id="insiders-action"]`
    )
    await fetcher.clickWhile(`button[data-test-id="insideractivity_showmore"]`)
  }
  const [tipInsiderActions, tipInsiderActionDates] = shouldGetInsiders
    ? await fetcher.fetchPageData([
        `//table[@id="tipranks-insider-activity"]/tbody/tr/td/div[@data-test-id="insiders-action"]`,
        `//table[@id="tipranks-insider-activity"]/tbody/tr/td/span[@data-test-id="date-cell"]`,
      ])
    : []

  const tipInsiderEvents =
    shouldGetInsiders && tipInsiderActions && tipInsiderActionDates
      ? zip(tipInsiderActionDates, tipInsiderActions)
          .filter(([, action]) => !action.includes("Uninformative"))
          .map(event => event.join(" -> "))
          .join("\n")
      : ""

  await fetcher.close()

  return {
    tipUpdatedAt: makePrettyDate(),
    tipAnalysts,
    tipInsiderEvents,
    tipScore,
    tipAnalystRatings,
    tipInsiderActivity,
    tipHedgeActivity,
    tipNewSent,
    tipBloggers,
    tipInvestors,
    tipTechnicals,
    tipMomentum,
    tipROE,
    tipAssetGrowth,
    tipYoungHolders,
    tipMidageHolders,
    tipOldHolders,
    tipTarget: tipTargetStr ? tipTargetStr.split("$")[1] : "",
    tipBlogArticles:
      tipBlogArticles && tipBlogArticleDates
        ? flatten(zip(tipBlogArticleDates, tipBlogArticles))
        : [],
    tipHedgeMoves,
    tipHedgeRating,
  }
}

/**
 * @param ticker
 * @param {ScrapeTools} fetchPdfData
 * @returns {Promise<{}|{ncRoic:*, ncPB:*, ncRating:*, ncFCF:*, ncGap:*, ncEps:*}>}
 */
exports.fetchNewConstructs = async (ticker, { fetchPdfData }) => {
  const [
    ncRating,
    [ncRatingB, ncRoic, ncFCF, ncEps, ncGap, ncPB] = [],
  ] = await fetchPdfData({
    analystName: NEW_CONSTRUCTS,
    url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
    xPathArr: [
      prevSiblingTextContains("(MM)"),
      `//span[text()="1 - Very Attractive" or text()="2 - Attractive" or text()="3 - Neutral"  or text()="4 - Unattractive" or text()="5 - Very Unattractive"]`,
    ],
    waitForPostScroll: `//span[contains(text(),"Price-to-EBV Ratio is")]`,
  })

  if (ncRating !== ncRatingB) {
    console.error("New Constructs rating mismatch!!!!!!")
    return {}
  }

  return {
    ncUpdatedAt: makePrettyDate(),
    ncEps,
    ncFCF,
    ncGap,
    ncPB,
    ncRating,
    ncRoic,
  }
}

/**
 * @param ticker
 * @param {ScrapeTools} fetchPdfData
 * @param url
 * @returns {Promise<Object>}
 */
exports.fetchZacks = async (ticker, { fetchPdfData }, url) => {
  const [
    zacksRank,
    zacksTarget,
    zacksRecommendation,
    zacksVGM,
    zacksValue,
    zacksGrowth,
    zacksMomentum,
    [zacksIndustryRank] = [],
    zacksEpsSurprise,
    zacksSalesSurprise,
    zacksExpectedReportDate,
    zacksReportDate,
    zacksQuarterlyEps,
    zacksAnnualEps,
    zacksEVEbitda,
    zacksPEG,
    zacksPB,
    zacksPCF,
    zacksEarningsYield,
    zacksDebtEquity,
    zacksCashFlowPerShare,
    zacksHistEpsGrowth, // 3-5 years
    zacksProjEpsGrowth,
    zacksCurrCashFlowGrowth,
    zacksHistCashFlowGrowth,
    zacksCurrentRatio,
    zacksDebtCapital,
    zacksNetMargin,
    zacksROE,
    zacksSalesToAssets,
    zacksProjSalesGrowth,
    zacksPriceStr,
  ] = await fetchPdfData({
    analystName: ZACKS,
    url,
    waitForPostScroll: prevSiblingTextContains("Proj. Sales Growth (F1/F0)"),
    xPathArr: [
      `//span[text()="Zacks Style Scores:" or text()="Zacks Rank: "]/following-sibling::span[position()=1 and not(text()="(1-5)")]`,
      prevSiblingTextIs("Price Target (6-12 Months): "),
      prevSiblingTextIs("Zacks Recommendation:", 4),
      prevSiblingTextIs("VGM:"),
      `//*[@id="viewer"]//span[contains(text(),"Value: ")]`,
      `//*[@id="viewer"]//span[contains(text(),"Growth: ")]`,
      `//*[@id="viewer"]//span[contains(text(),"Momentum: ")]`,
      prevSiblingTextContains("Zacks Industry Rank"),
      prevSiblingTextContains("Last EPS Surprise"),
      prevSiblingTextContains("Last Sales Surprise"),
      prevSiblingTextContains("Expected Report Date"),
      prevSiblingTextIs("Report Date"),
      prevSiblingTextContains("Quarterly EPS"),
      prevSiblingTextContains("Annual EPS (TTM)"),
      prevSiblingTextContains("EV/EBITDA"),
      prevSiblingTextContains("PEG Ratio"),
      prevSiblingTextContains("Price/Book (P/B)"),
      prevSiblingTextContains("Price/Cash Flow (P/CF)"),
      prevSiblingTextContains("Earnings Yield"),
      prevSiblingTextContains("Debt/Equity"),
      prevSiblingTextContains("Cash Flow ($/share)"),
      prevSiblingTextContains("Hist. EPS Growth (3-5 yrs)"),
      prevSiblingTextContains("Proj. EPS Growth (F1/F0)"),
      prevSiblingTextContains("Curr. Cash Flow Growth"),
      prevSiblingTextContains("Hist. Cash Flow Growth (3-5 yrs)"),
      prevSiblingTextContains("Current Ratio"),
      prevSiblingTextContains("Debt/Capital"),
      prevSiblingTextContains("Net Margin"),
      prevSiblingTextContains("Return on Equity"),
      prevSiblingTextContains("Sales/Assets"),
      prevSiblingTextContains("Proj. Sales Growth (F1/F0)"),
      `//div[@id="viewer"]//div[@data-page-number=1]//span[2]`,
    ],
  })

  const zacksPriceStrClean = zacksPriceStr ? zacksPriceStr.replace("$", "") : ""
  const zacksPrice = Number(zacksPriceStrClean) || ""

  return {
    zacksUpdatedAt: makePrettyDate(),
    zacksRank,
    zacksTarget,
    zacksRecommendation,
    zacksVGM,
    zacksValue,
    zacksGrowth,
    zacksMomentum,
    zacksIndustryRank,
    zacksEpsSurprise,
    zacksSalesSurprise,
    zacksExpectedReportDate,
    zacksQuarterlyEps,
    zacksAnnualEps,
    zacksEVEbitda,
    zacksPEG,
    zacksEgPerShare: zacksPrice / zacksPEG,
    zacksPB,
    zacksBookPerShare: zacksPrice / zacksPB,
    zacksPCF,
    zacksEarningsYield,
    zacksDebtEquity,
    zacksCashFlowPerShare,
    zacksHistEpsGrowth, // 3-5 years
    zacksProjEpsGrowth,
    zacksCurrCashFlowGrowth,
    zacksHistCashFlowGrowth,
    zacksCurrentRatio,
    zacksDebtCapital,
    zacksNetMargin,
    zacksROE,
    zacksSalesToAssets,
    zacksProjSalesGrowth,
    zacksPrice,
    zacksReportDate,
  }
}

/**
 * @param ticker
 * @param {ScrapeTools} getPageDataFetcher
 * @returns Promise<{fidelityEVIndustry:*, fidelityRevChngIndustryPct:*, fidelityOpMarginIndustryPct:*, fidelityRoAMrqIndustryPct:*, fidelityCurrentIndustry:*, fidelityIncomeEmploy:*, fidelityRevChngIndustry:*, fidelityPeFiveYrIndustry:*, fidelityPretaxMarginMrqIndustry:*, fidelityRoIIndustry:*, fidelityPayoutIndustryPct:*, fidelityDAMrqIndustry:*, fidelityPcf:*, fidelityRoAIndustry:*, fidelityRoIMrqIndustry:*, fidelityPayoutIndustry:*, fidelityPEGFiveYrIndustryPct:*, fidelityEpsGrowthYoYIndustryPct:*, fidelityEV:*, fidelityEpsGrowthYoY:*, fidelityEpsGrowthProj:*, fidelityPcfMrqIndustry:*, fidelityEpsGrowthProjIndustryPct:*, fidelityIncomeEmployIndustry:*, fidelityPBookIndustry:*, fidelityDA:*, fidelityEpsGrowthProjIndustry:*, fidelityLongDEMrqIndustryPct:*, fidelityDC:*, fidelityDE:*, fidelityRoIMrqIndustryPct:*, fidelityPEGFiveYrIndustry:*, fidelityPeIndustryPct:*, fidelityPayout:*, fidelityPeFiveYrIndustryPct:*, fidelityRoE:*, fidelityPBook:*, fidelityLongDEIndustry:*, fidelityRoEIndustryPct:*, fidelityRoI:*, fidelityLongDEMrq:*, fidelityLongDE:*, fidelityPeIndustry:*, fidelityProfitMarginMrqIndustryPct:*, fidelityCurrent:*, fidelityPSalesMrq:*, fidelityBookValueIndustryPct:*, fidelityGMargin:*, fidelityPretaxMarginMrqIndustryPct:*, fidelityEpsGrowth:*, fidelityPeFiveYr:*, fidelityEbitdMarginIndustryPct:*, fidelityDCIndustry:*, fidelityPSalesIndustry:*, fidelityRoeMrqIndustryPct:*, fidelityIncomeEmployIndustryPct:*, fidelityProfitMarginMrqIndustry:*, fidelityDEMrqIndustry:*, fidelityEVIndustryPct:*, fidelityEpsGrowthFiveYrIndustryPct:*, fidelityDCIndustryPct:*, fidelityPSalesMrqIndustry:*, fidelityGMarginIndustryPct:*, fidelityRevEmploy:*, fidelityDAMrq:*, fidelityRevChngYoYIndustry:*, fidelityRoAIndustryPct:*, fidelityDAMrqIndustryPct:*, fidelityCurrentIndustryPct:*, fidelityDEIndustryPct:*, fidelityCFlowGrowthFiveYrIndustryPct:*, fidelityLongDEIndustryPct:*, fidelityEpsGrowthProjLongIndustry:*, fidelityDCMrqIndustry:*, fidelityRevGrowthFiveYrIndustryPct:*, fidelityDEMrqIndustryPct:*, fidelityFcFIndustryPct:*, fidelityPretaxMargin:*, fidelityPSales:*, fidelityRevEmployIndustryPct:*, fidelityOpMarginMrq:*, fidelityGMarginMrqIndustry:*, fidelityBookGrowthFiveYr:*, fidelityRevChngYoY:*, fidelityRevChng:*, fidelityLongDEMrqIndustry:*, fidelityPSalesIndustryPct:*, fidelityEpsGrowthFiveYr:*, fidelityEpsGrowthProjLongIndustryPct:*, fidelityPBookIndustryPct:*, fidelityFcFIndustry:*, fidelityEpsGrowthIndustry:*, fidelityRoAMrqIndustry:*, fidelityBookGrowthFiveYrIndustry:*, fidelityDCMrq:*, fidelityBookValueIndustry:*, fidelityEpsGrowthYoYIndustry:*, fidelityBookValue:*, fidelityEbitdMarginIndustry:*, fidelityRevGrowthFiveYrIndustry:*, fidelityOpMargin:*, fidelityPretaxMarginIndustryPct:*, fidelityRoeMrq:*, fidelityPe:*, fidelityPcfIndustryPct:*, fidelityPretaxMarginIndustry:*, fidelityPcfMrq:*, fidelityGMarginMrqIndustryPct:*, fidelityDCMrqIndustryPct:*, fidelityFcF:*, fidelityPcfIndustry:*, fidelityOpMarginMrqIndustryPct:*, fidelityOpMarginMrqIndustry:*, fidelityDAIndustryPct:*, fidelityEbitdMargin:*, fidelityEpsGrowthFiveYrIndustry:*, fidelityBookGrowthFiveYrIndustryPct:*, fidelityCompustatLink:*, fidelityRoAMrq:*, fidelityRoA:*, fidelityRoIMrq:*, fidelityEpsGrowthIndustryPct:*, fidelityEpsGrowthProjLong:*, fidelityDAIndustry:*, fidelityProfitMarginMrq:*, fidelityCFlowGrowthFiveYrIndustry:*, fidelityRevChngYoYIndustryPct:*, fidelityGMarginMrq:*, fidelityOpMarginIndustry:*, fidelityDEMrq:*, fidelityPEGFiveYr:*, fidelityPcfMrqIndustryPct:*, fidelityRevGrowthFiveYr:*, fidelityRoeMrqIndustry:*, fidelityDEIndustry:*, fidelityPSalesMrqIndustryPct:*, fidelityCFlowGrowthFiveYr:*, fidelityPretaxMarginMrq:*, fidelityGMarginIndustry:*, fidelityRoEIndustry:*, fidelityRoIIndustryPct:*, fidelityRevEmployIndustry:*}>
 */
exports.fetchFidelityKeyStats = async (ticker, { getPageDataFetcher }) => {
  const fidelityKeyStatXpath = name =>
    `//div[@id="audit-integrity"]/table//tr[contains(td,"${name}")]/td[contains(@class,"right")]`

  const fetcher = getPageDataFetcher(FIDELITY_STATS)
  await fetcher.setPage(
    `https://eresearch.fidelity.com/eresearch/evaluate/fundamentals/keyStatistics.jhtml?stockspage=keyStatistics&symbols=${ticker}`
  )

  const [
    fidelityPrice,
    fidelityTimeAndDate,
    [fidelityPe, fidelityPeIndustry, fidelityPeIndustryPct] = [], // TTM, which is default vs. Mrq
    [
      fidelityPeFiveYrAvg,
      fidelityPeFiveYrAvgIndustry,
      fidelityPeFiveYrAvgIndustryPct,
    ] = [],
    [
      fidelityPEGFiveYrProj,
      fidelityPEGFiveYrProjIndustry,
      fidelityPEGFiveYrProjIndustryPct,
    ] = [],
    [fidelityEV, fidelityEVIndustry, fidelityEVIndustryPct] = [],
    [fidelityPcfMrq, fidelityPcfMrqIndustry, fidelityPcfMrqIndustryPct] = [],
    [fidelityPcf, fidelityPcfIndustry, fidelityPcfIndustryPct] = [],
    [fidelityPSalesMrq, fidelityPSalesMrqIndustry, fidelityPSalesMrqIndustryPct] = [],
    [fidelityPSales, fidelityPSalesIndustry, fidelityPSalesIndustryPct] = [],
    [fidelityPBookWithDate, fidelityPBookIndustry, fidelityPBookIndustryPct] = [],
    [
      fidelityBookValueWithDate,
      fidelityBookValueIndustry,
      fidelityBookValueIndustryPct,
    ] = [],
    [
      fidelityEpsGrowthYoY,
      fidelityEpsGrowthYoYIndustry,
      fidelityEpsGrowthYoYIndustryPct,
    ] = [],
    [fidelityEpsGrowth, fidelityEpsGrowthIndustry, fidelityEpsGrowthIndustryPct] = [], // ttm vs. prior ttm
    [
      fidelityEpsGrowthFiveYr,
      fidelityEpsGrowthFiveYrIndustry,
      fidelityEpsGrowthFiveYrIndustryPct,
    ] = [],
    [
      fidelityEpsGrowthProj,
      fidelityEpsGrowthProjIndustry,
      fidelityEpsGrowthProjIndustryPct,
    ] = [],
    [
      fidelityEpsGrowthProjLong,
      fidelityEpsGrowthProjLongIndustry,
      fidelityEpsGrowthProjLongIndustryPct,
    ] = [],
    [fidelityRevChngYoY, fidelityRevChngYoYIndustry, fidelityRevChngYoYIndustryPct] = [],
    [fidelityRevChng, fidelityRevChngIndustry, fidelityRevChngIndustryPct] = [],
    [
      fidelityRevGrowthFiveYr,
      fidelityRevGrowthFiveYrIndustry,
      fidelityRevGrowthFiveYrIndustryPct,
    ] = [],
    [
      fidelityBookGrowthFiveYr,
      fidelityBookGrowthFiveYrIndustry,
      fidelityBookGrowthFiveYrIndustryPct,
    ] = [],
    [fidelityFcF, fidelityFcFIndustry, fidelityFcFIndustryPct] = [],
    [
      fidelityCFlowGrowthFiveYr,
      fidelityCFlowGrowthFiveYrIndustry,
      fidelityCFlowGrowthFiveYrIndustryPct,
    ] = [],
    [fidelityGMarginMrq, fidelityGMarginMrqIndustry, fidelityGMarginMrqIndustryPct] = [],
    [fidelityGMargin, fidelityGMarginIndustry, fidelityGMarginIndustryPct] = [],
    [
      fidelityEbitdMargin,
      fidelityEbitdMarginIndustry,
      fidelityEbitdMarginIndustryPct,
    ] = [],
    [
      fidelityProfitMarginMrq,
      fidelityProfitMarginMrqIndustry,
      fidelityProfitMarginMrqIndustryPct,
    ] = [],
    [
      fidelityOpMarginMrq,
      fidelityOpMarginMrqIndustry,
      fidelityOpMarginMrqIndustryPct,
    ] = [],
    [fidelityOpMargin, fidelityOpMarginIndustry, fidelityOpMarginIndustryPct] = [],
    [
      fidelityPretaxMarginMrq,
      fidelityPretaxMarginMrqIndustry,
      fidelityPretaxMarginMrqIndustryPct,
    ] = [],
    [
      fidelityPretaxMargin,
      fidelityPretaxMarginIndustry,
      fidelityPretaxMarginIndustryPct,
    ] = [],
    [fidelityRoeMrq, fidelityRoeMrqIndustry, fidelityRoeMrqIndustryPct] = [],
    [fidelityRoE, fidelityRoEIndustry, fidelityRoEIndustryPct] = [],
    [fidelityRoAMrq, fidelityRoAMrqIndustry, fidelityRoAMrqIndustryPct] = [],
    [fidelityRoA, fidelityRoAIndustry, fidelityRoAIndustryPct] = [],
    [fidelityRoIMrq, fidelityRoIMrqIndustry, fidelityRoIMrqIndustryPct] = [],
    [fidelityRoI, fidelityRoIIndustry, fidelityRoIIndustryPct] = [],
    [fidelityLongDEMrq, fidelityLongDEMrqIndustry, fidelityLongDEMrqIndustryPct] = [],
    [fidelityLongDE, fidelityLongDEIndustry, fidelityLongDEIndustryPct] = [],
    [fidelityDAMrq, fidelityDAMrqIndustry, fidelityDAMrqIndustryPct] = [],
    [fidelityDA, fidelityDAIndustry, fidelityDAIndustryPct] = [],
    [fidelityDCMrq, fidelityDCMrqIndustry, fidelityDCMrqIndustryPct] = [],
    [fidelityDC, fidelityDCIndustry, fidelityDCIndustryPct] = [],
    [fidelityDEMrq, fidelityDEMrqIndustry, fidelityDEMrqIndustryPct] = [],
    [fidelityDE, fidelityDEIndustry, fidelityDEIndustryPct] = [],
    [fidelityCurrent, fidelityCurrentIndustry, fidelityCurrentIndustryPct] = [],
    [fidelityPayout, fidelityPayoutIndustry, fidelityPayoutIndustryPct] = [],
    [
      fidelityIncomeEmploy,
      fidelityIncomeEmployIndustry,
      fidelityIncomeEmployIndustryPct,
    ] = [],
    [fidelityRevEmploy, fidelityRevEmployIndustry, fidelityRevEmployIndustryPct] = [],
    fidelityCompustatLink,
  ] = await fetcher.fetchPageData([
    `//span[@id="lastPrice"]`,
    `//span[@id="timeAndDate"]`,
    fidelityKeyStatXpath("P/E (Trailing Twelve Months)"),
    fidelityKeyStatXpath("P/E (5-Year Average)"),
    fidelityKeyStatXpath("PEG Ratio (5-Year Projected)"),
    fidelityKeyStatXpath("Enterprise Value"),
    fidelityKeyStatXpath("Price/Cash Flow (Most Recent Quarter)"),
    fidelityKeyStatXpath("Price/Cash Flow (TTM)"),
    fidelityKeyStatXpath("Price/Sales (Most Recent Quarter)"),
    fidelityKeyStatXpath("Price/Sales (TTM)"),
    fidelityKeyStatXpath("Price/Book"),
    fidelityKeyStatXpath("Book Value"),
    fidelityKeyStatXpath("EPS Growth (Last Qrtr vs. Same Qrtr Prior Year)"),
    fidelityKeyStatXpath("EPS Growth (TTM vs. Prior TTM)"),
    fidelityKeyStatXpath("EPS Growth (Last 5 Years)"),
    fidelityKeyStatXpath("Projected EPS Growth (Next Year vs. This Year)"),
    fidelityKeyStatXpath("Forward EPS Long Term Growth (3-5 Yrs)"),
    fidelityKeyStatXpath("Revenue % Change (Last Qrtr vs. Same Qrtr Prior Year)"),
    fidelityKeyStatXpath("Revenue % Change (TTM)"),
    fidelityKeyStatXpath("Revenue Growth (Last 5 Years)"),
    fidelityKeyStatXpath("Book Value per Share Growth (Last 5 Years)"),
    fidelityKeyStatXpath("Free Cash Flow (TTM)"),
    fidelityKeyStatXpath("Cash Flow Growth Rate (Last 5 Years)"),
    fidelityKeyStatXpath("Gross Margin (Most Recent Quarter, Annualized)"),
    fidelityKeyStatXpath("Gross Margin (TTM)"),
    fidelityKeyStatXpath("EBITD Margin (TTM)"),
    fidelityKeyStatXpath("Profit Margin (Most Recent Quarter)"),
    fidelityKeyStatXpath("Operating Margin (Most Recent Quarter, Annualized)"),
    fidelityKeyStatXpath("Operating Margin (TTM)"),
    fidelityKeyStatXpath("Pretax Margin (Most Recent Quarter, Annualized)"),
    fidelityKeyStatXpath("Pretax Margin (TTM)"),
    fidelityKeyStatXpath("Return on Equity (Most Recent Quarter, Annualized)"),
    fidelityKeyStatXpath("Return on Equity (TTM)"),
    fidelityKeyStatXpath("Return on Assets (Most Recent Quarter, Annualized)"),
    fidelityKeyStatXpath("Return on Assets (TTM)"),
    fidelityKeyStatXpath("Return on Investment (Most Recent Quarter, Annualized)"),
    fidelityKeyStatXpath("Return on Investment (TTM)"),
    fidelityKeyStatXpath("Long Term Debt/Equity (Most Recent Quarter, Annualized)"),
    fidelityKeyStatXpath("Long Term Debt/Equity (TTM)"),
    fidelityKeyStatXpath("Total Debt/Assets (Most Recent Quarter, Annualized)"),
    fidelityKeyStatXpath("Total Debt/Assets (TTM)"),
    fidelityKeyStatXpath("Total Debt/Capital (Most Recent Quarter)"),
    fidelityKeyStatXpath("Total Debt/Capital (TTM)"),
    fidelityKeyStatXpath("Total Debt/Equity (Most Recent Quarter, Annualized)"),
    fidelityKeyStatXpath("Total Debt/Equity (TTM)"),
    fidelityKeyStatXpath("Current Ratio (TTM)"),
    fidelityKeyStatXpath("Payout Ratio (TTM)"),
    fidelityKeyStatXpath("Income/Employee (TTM)"),
    fidelityKeyStatXpath("Revenue/Employee (TTM)"),
    `//img[@title="MSCI Company Report"]/following-sibling::a/@href`,
  ])

  await fetcher.close()

  const [fidelityBookValue, fidelityBookValueDate] = getFirstLastValue(
    fidelityBookValueWithDate
  )
  const [fidelityPBook] = getFirstLastValue(fidelityPBookWithDate)

  return mapValues(
    {
      fidelityStatsUpdatedAt: makePrettyDate(),
      fidelityPrice,
      fidelityTimeAndDate,
      fidelityPe,
      fidelityPeIndustry,
      fidelityPeIndustryPct,
      fidelityPeRev: fidelityPrice / fidelityPe,
      fidelityPeFiveYrAvg,
      fidelityPeFiveYrAvgIndustry,
      fidelityPeFiveYrAvgIndustryPct,
      fidelityPeFiveYrAvgRev: fidelityPrice / fidelityPeFiveYrAvg,
      fidelityPEGFiveYrProj,
      fidelityPEGFiveYrProjIndustry,
      fidelityPEGFiveYrProjIndustryPct,
      fidelityPEGFiveYrProjRev: fidelityPrice / fidelityPEGFiveYrProj,
      fidelityEV,
      fidelityEVIndustry,
      fidelityEVIndustryPct,
      fidelityPcfMrq,
      fidelityPcfMrqIndustry,
      fidelityPcfMrqIndustryPct,
      fidelityPcfMrqRev: fidelityPrice / fidelityPcfMrq,
      fidelityPcf,
      fidelityPcfIndustry,
      fidelityPcfIndustryPct,
      fidelityPcfRev: fidelityPrice / fidelityPcf,
      fidelityPSalesMrq,
      fidelityPSalesMrqIndustry,
      fidelityPSalesMrqIndustryPct,
      fidelityPSalesMrqRev: fidelityPrice / fidelityPSalesMrq,
      fidelityPSales,
      fidelityPSalesIndustry,
      fidelityPSalesIndustryPct,
      fidelityPSalesRev: fidelityPrice / fidelityPSales,
      fidelityPBook,
      fidelityPBookIndustry,
      fidelityPBookIndustryPct,
      fidelityPBookRev: fidelityPrice / fidelityPBook,
      fidelityBookValue,
      fidelityBookValueDate,
      fidelityBookValueIndustry,
      fidelityBookValueIndustryPct,
      fidelityEpsGrowthYoY,
      fidelityEpsGrowthYoYIndustry,
      fidelityEpsGrowthYoYIndustryPct,
      fidelityEpsGrowth,
      fidelityEpsGrowthIndustry,
      fidelityEpsGrowthIndustryPct,
      fidelityEpsGrowthFiveYr,
      fidelityEpsGrowthFiveYrIndustry,
      fidelityEpsGrowthFiveYrIndustryPct,
      fidelityEpsGrowthProj,
      fidelityEpsGrowthProjIndustry,
      fidelityEpsGrowthProjIndustryPct,
      fidelityEpsGrowthProjLong,
      fidelityEpsGrowthProjLongIndustry,
      fidelityEpsGrowthProjLongIndustryPct,
      fidelityRevChngYoY,
      fidelityRevChngYoYIndustry,
      fidelityRevChngYoYIndustryPct,
      fidelityRevChng,
      fidelityRevChngIndustry,
      fidelityRevChngIndustryPct,
      fidelityRevGrowthFiveYr,
      fidelityRevGrowthFiveYrIndustry,
      fidelityRevGrowthFiveYrIndustryPct,
      fidelityBookGrowthFiveYr,
      fidelityBookGrowthFiveYrIndustry,
      fidelityBookGrowthFiveYrIndustryPct,
      fidelityFcF: millBillStrToNum(fidelityFcF),
      fidelityFcFIndustry: millBillStrToNum(fidelityFcFIndustry),
      fidelityFcFIndustryPct,
      fidelityCFlowGrowthFiveYr,
      fidelityCFlowGrowthFiveYrIndustry,
      fidelityCFlowGrowthFiveYrIndustryPct,
      fidelityGMarginMrq,
      fidelityGMarginMrqIndustry,
      fidelityGMarginMrqIndustryPct,
      fidelityGMargin,
      fidelityGMarginIndustry,
      fidelityGMarginIndustryPct,
      fidelityEbitdMargin,
      fidelityEbitdMarginIndustry,
      fidelityEbitdMarginIndustryPct,
      fidelityProfitMarginMrq,
      fidelityProfitMarginMrqIndustry,
      fidelityProfitMarginMrqIndustryPct,
      fidelityOpMarginMrq,
      fidelityOpMarginMrqIndustry,
      fidelityOpMarginMrqIndustryPct,
      fidelityOpMargin,
      fidelityOpMarginIndustry,
      fidelityOpMarginIndustryPct,
      fidelityPretaxMarginMrq,
      fidelityPretaxMarginMrqIndustry,
      fidelityPretaxMarginMrqIndustryPct,
      fidelityPretaxMargin,
      fidelityPretaxMarginIndustry,
      fidelityPretaxMarginIndustryPct,
      fidelityRoeMrq,
      fidelityRoeMrqIndustry,
      fidelityRoeMrqIndustryPct,
      fidelityRoE,
      fidelityRoEIndustry,
      fidelityRoEIndustryPct,
      fidelityRoAMrq,
      fidelityRoAMrqIndustry,
      fidelityRoAMrqIndustryPct,
      fidelityRoA,
      fidelityRoAIndustry,
      fidelityRoAIndustryPct,
      fidelityRoIMrq,
      fidelityRoIMrqIndustry,
      fidelityRoIMrqIndustryPct,
      fidelityRoI,
      fidelityRoIIndustry,
      fidelityRoIIndustryPct,
      fidelityLongDEMrq,
      fidelityLongDEMrqIndustry,
      fidelityLongDEMrqIndustryPct,
      fidelityLongDE,
      fidelityLongDEIndustry,
      fidelityLongDEIndustryPct,
      fidelityDAMrq,
      fidelityDAMrqIndustry,
      fidelityDAMrqIndustryPct,
      fidelityDA,
      fidelityDAIndustry,
      fidelityDAIndustryPct,
      fidelityDCMrq,
      fidelityDCMrqIndustry,
      fidelityDCMrqIndustryPct,
      fidelityDC,
      fidelityDCIndustry,
      fidelityDCIndustryPct,
      fidelityDEMrq,
      fidelityDEMrqIndustry,
      fidelityDEMrqIndustryPct,
      fidelityDE,
      fidelityDEIndustry,
      fidelityDEIndustryPct,
      fidelityCurrent,
      fidelityCurrentIndustry,
      fidelityCurrentIndustryPct,
      fidelityPayout,
      fidelityPayoutIndustry,
      fidelityPayoutIndustryPct,
      fidelityIncomeEmploy,
      fidelityIncomeEmployIndustry,
      fidelityIncomeEmployIndustryPct,
      fidelityRevEmploy,
      fidelityRevEmployIndustry,
      fidelityRevEmployIndustryPct,
      fidelityCompustatLink,
    },
    cleanFidelityStrings
  )
}

/**
 * @param ticker
 * @param  {ScrapeTools} getPageDataFetcher
 * @returns Promise<Object>
 */
exports.fetchFidelityAnalystOpinions = async (ticker, { getPageDataFetcher }) => {
  const formatFidelityStarmine = (name, rating) =>
    `${(name || "").substring(0, 14)} - ${rating}`

  const fidelityFetcher = getPageDataFetcher(FIDELITY)
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

  const fidelityReportData = await fidelityFetcher.fetchFidelityReportData(
    fidelityReportNameArr
  )

  await fidelityFetcher.close()

  return {
    fidelityAnalystsUpdatedAt: makePrettyDate(),
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
    ...fidelityReportData,
  }
}

/**
 * @param ticker
 * @param cookie
 * @returns {Promise<*|null>}
 */
exports.getMoodysLink = async (ticker, cookie) => {
  const text = await fetchText(
    "https://www.moodys.com/services/mdc-global?name=getTypeAheadResult",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,es;q=0.8",
        "content-type": "application/json",
        "sec-ch-ua": '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-lang": "en",
        cookie,
      },
      referrer:
        "https://www.moodys.com/credit-ratings/ATT-Inc-credit-rating-702550/reports?category=Ratings_and_Assessments_Reports_rc|Issuer_Reports_rc|Issuer_Data_Reports&type=Rating_Action_rc|Announcement_rc|Announcement_of_Periodic_Review_rc,Credit_Opinion_ir_rc,Peer_Snapshot_rc",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: `{"data":["${ticker}","en"]}`,
      method: "POST",
      mode: "cors",
    }
  )
  try {
    const data = JSON.parse(text).data.organizations[0]
    return data && data.ticker === ticker ? data : null
  } catch (error) {
    return null
  }
}

/**
 * @param ticker
 * @returns {Promise<{wsjChart,wsjShortPct,wsjShortChange}>}
 */
exports.fetchWSJData = async ticker => {
  const url = `https://www.wsj.com/market-data/quotes/${ticker}`
  try {
    const [mainPage, researchPage] = await Promise.all([
      fetchText(url),
      fetchText(url + "/research-ratings"),
    ])
    const researchPageDoc = Cheerio.load(researchPage)
    const html = researchPageDoc(".cr_analystRatings .data_data")

    const mainPageDoc = Cheerio.load(mainPage)
    return {
      wsjUpdatedAt: makePrettyDate(),
      wsjChart: html
        .contents()
        .get()
        .map(node => node.data),
      wsjShortPct: mainPageDoc(`h5:contains("Percent of Float")`).next().text(),
      wsjShortChange: mainPageDoc(`h5:contains("Change from Last")`).next().text(),
      wsjShortDate: mainPageDoc(`h3:contains("Short Interest ") span`).text(),
    }
  } catch (err) {
    console.error("WSJ ERROR: ", err)
    return []
  }
}

/**
 * @param ticker
 * @returns {Promise<any>}
 */
exports.fetchYahooData = async ticker => {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${YAHOO_MODULES.join(
    ","
  )}`
  const text = await fetchText(url)
  return JSON.parse(text)
}

exports.fetchCFRAData = async (ticker, cfraRating, cfraLink, { fetchPdfData }) => {
  const [cfraTargetStr, cfraFairValue, cfraDate] = hasCFRA(cfraRating, ticker, "CFRA")
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

  return {
    cfraTarget: extractNumbers(cfraTargetStr),
    cfraFairValue,
    cfraDate,
    cfraUpdatedAt: makePrettyDate(),
  }
}

exports.fetchBoaData = async (ticker, { getPageDataFetcher }) => {
  const boaFetcher = getPageDataFetcher(BOA)
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
  return {
    boaRating,
    boaVolatility,
    boaIncome,
    boaInvestment,
    morningstarRating,
    morningstarLink,
    cfraRating,
    cfraLink,
  }
}

exports.fetchArgusAnalyst = async (ticker, url, { fetchPdfData }) => {
  const [
    argusAnalystRating,
    argusAnalystTargetStr,
    argusAnalystFinancialStrength,
    argusAnalystOneYrEpsGrowth,
    argusAnalystFiveYrEpsGrowth,
    argusAnalystOneYrDivGrowth,
  ] = await fetchPdfData({
    analystName: ARGUS_ANALYST,
    url,
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

  return {
    argusAnalystRating,
    argusAnalystFinancialStrength,
    argusAnalystOneYrEpsGrowth,
    argusAnalystFiveYrEpsGrowth,
    argusAnalystOneYrDivGrowth,
    argusAnalystTarget,
  }
}

exports.fetchMorningstarData = async (ticker, url, { fetchPdfData }) => {
  const [
    [morningstarFairValue] = [],
    morningstarMoat,
    morningstarUncertainty,
    morningstarCapitalAllocation,
    [morningstarDate] = [],
  ] = await fetchPdfData({
    analystName: MORNINGSTAR,
    url,
    xPathArr: [
      prevSiblingTextIs("Capital Allocation", 4),
      followingSiblingTextIs("Price vs. Fair Value ", 4),
      followingSiblingTextIs("Price vs. Fair Value ", 2),
      followingSiblingTextIs("Price vs. Fair Value ", 1),
      prevSiblingTextIs("Capital Allocation", 6),
    ],
  })

  return {
    morningstarFairValue,
    morningstarMoat,
    morningstarUncertainty,
    morningstarCapitalAllocation,
    morningstarDate,
  }
}

//  UNUSED

const avApiKey = "1FSCTLZ457VMJH2F"
const avUrl = "https://www.alphavantage.co/query?function="
exports.fetchAlphaVantageData = async (ticker, func) => {
  const text = await fetchText(avUrl + func + "&symbol=" + ticker + "&apikey=" + avApiKey)
  return JSON.parse(text)
}

const iexToken = "Tsk_05e3881c9446499bac9b6778ca0c2f8e"
exports.fetchIEXData = async (ticker, datum) => {
  const url = `https://sandbox.iexapis.com/stable/data-points/${ticker}/${datum}?token=${iexToken}`
  const text = await fetchText(url)
  return JSON.parse(text)
}
