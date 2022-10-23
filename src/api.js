const Cheerio = require("cheerio")
const makeScrapeTools = require("./makeScrapeTools")
const { last, chunk, zip, mapValues, isString, flatten, partition } = require("lodash")
const {
  prevSiblingTextContains,
  selfTextContains,
  followingSiblingTextIs,
  prevSiblingTextIs,
  millBillStrToNum,
  hasCFRA,
  extractNumbers,
  makePrettyDate,
  containsClass,
  pause,
} = require("./util")
const Logger = require("./Logger")
const stockData = require("../stockData.json")
const vooData = require("../vooData.json")

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
  const response = await fetch(/**@type * */ ...fetchArgs)
  return await response.text()
}

const hedgeFundValues = [
  { first: "warren", last: "buffett", value: 6 },
  { first: "bill", last: "gates", value: 5 },
  { first: "daniel", last: "loeb", value: 5 },
  { first: "meridian", last: "", value: 5 },
  { first: "david", last: "tepper", value: 5 },
  { first: "carl", last: "icahn", value: 5 },
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
  { first: "george", last: "soros", value: 2 },
  { first: "bill", last: "ackman", value: 5 },
  { first: "fairholme", last: "", value: 4 }, // fairholme
  { first: "bruce", last: "berkowitz", value: 4 }, // fairholme
  { first: "vanguard", last: "health", value: 4 }, // vanguard health
  { first: "edward", last: "owens", value: 4 }, // vanguard health
  { first: "arkk", last: "", value: 0 }, // cathie wood
  { first: "cathie", last: "wood", value: 0 }, // cathie wood
  { first: "catherine", last: "wood", value: 0 }, // cathie wood
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
  { first: "joel", last: "greenblatt", value: 1 },
  { first: "tweedy", last: "browne", value: 1 },
  { first: "martin", last: "whitman", value: 1 },
  { first: "mason", last: "hawkins", value: 1 },
  { first: "john", last: "hussman", value: 1 },
  { first: "jeremy", last: "grantham", value: 1 },
  { first: "charles", last: "brandes", value: 1 },
  { first: "francis", last: "chou", value: 1 },
  { first: "louis", last: "bacon", value: 1 },
]

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<{fordRating:(number|string), fordRelativeValuation:*, fordEarningsStrength:*, fordPriceMovement:*}>}
 */
exports.fetchFordData = async (ticker, browser) => {
  const { fetchPdfData } = makeScrapeTools(ticker, browser)

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
    timeout: FORD_TIMEOUT,
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
  const getMovementValue = (movement, hedgeCoeff) => {
    const isPrimo = hedgeCoeff > 3

    const buyThreshold = 1,
      holdThreshold = -0.5,
      trimThreshold = -2,
      sellThreshold = -8,
      sellOutThreshold = -80,
      buyVal = 1.25,
      holdVal = isPrimo ? 0.5 : 0,
      rebalanceVal = 0,
      trimVal = -0.5,
      sellVal = -1,
      sellOutVal = -1.25

    const getNegativeVal = x =>
      x < sellOutThreshold
        ? sellOutVal
        : x < sellThreshold
        ? sellVal
        : x < trimThreshold
        ? trimVal
        : rebalanceVal
    const getPositiveVal = x => (x > buyThreshold ? buyVal : holdVal)

    return movement > holdThreshold ? getPositiveVal(movement) : getNegativeVal(movement)
  }

  return chunk(tipHedgeMoves.split("\n"), 2)
    .map(([name, move]) => [name, getChangePct(move)])
    .reduce((sum, [hedgeName, movement]) => {
      const mapData = hedgeFundValues.find(({ first, last }) => {
        const lowerName = hedgeName.toLowerCase()
        return lowerName.includes(first) && lowerName.includes(last)
      })
      const hedgeCoeff = mapData ? mapData.value : 1

      return sum + getMovementValue(movement, hedgeCoeff) * hedgeCoeff
    }, 0)
}

/**
 * @param ticker
 * @param {Browser} browser
 * @returns {Promise<Object>}
 */
exports.fetchTipData = async (ticker, browser) => {
  const { getPageDataFetcher } = makeScrapeTools(ticker, browser)

  const fetcher = getPageDataFetcher(TIPRANKS, { timeout: TIPRANKS_TIMEOUT })
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

  // ANALYSTS
  await fetcher.click(
    `div.tipranks-top-row > .tipranks-widget section[aria-label="Analyst Ratings"] > div > span > button`
  )
  await fetcher.waitForXpath(`//table[@id="tipranks-analyst-ratings"]/tbody/tr`)
  await fetcher.clickWhile(`button[data-test-id="tipranksanalystratings_showmore"]`)
  const analystStrings = await fetcher.fetchPageData([
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr/th/div[@class="analyst-cell"]/div[2]/span`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="converted-target-price"]`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="stock-rating"]`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="analyst-action"]`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="latest-report"]`,
  ])

  const tipAnalystsZip = zip(...analystStrings)
  const [maintained, changed] = partition(tipAnalystsZip, analyst =>
    ["initiated", "reiterated", "maintained"].includes(analyst[3].toLowerCase().trim())
  )
  const tipAnalysts = [...changed, "", ...maintained].join("\n")

  // INVESTORS
  await fetcher.click(
    `div.tipranks-top-row > .tipranks-widget section[aria-label="Investor Sentiment"] > div > span > button`
  )
  const [[tipYoungHolders, tipMidageHolders, tipOldHolders] = []] =
    await fetcher.fetchPageData([`//p[@class="age-group-box-bigNum holders"]`])

  // BLOGGERS
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

  // INSIDERS
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

exports.fetchTdData = async (ticker, browser) => {
  const { getPageDataFetcher } = makeScrapeTools(ticker, browser)
  const pageFetcher = getPageDataFetcher(TD, { timeout: TD_TIMEOUT })
  await pageFetcher.setPage(
    `https://invest.ameritrade.com/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/earnings?symbol=${ticker}&c_name=invest_VENDOR`
  )

  const [tdLastEarningsDate, tdNextEarningsDate] = await pageFetcher.fetchPageDataInFrame(
    [
      `//*[${containsClass("earnings-data")}]//td[1]/text()[2]`,
      `//td[${containsClass("value week-of")}]`,
    ],
    "main"
  )

  await pageFetcher.close()

  return {
    tdNextEarningsDate: tdNextEarningsDate?.replace("(Unconfirmed)", ""),
    tdLastEarningsDate: tdLastEarningsDate?.replace("Announced ", ""),
  }
}

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<{}|{ncRoic:*, ncPB:*, ncRating:*, ncFCF:*, ncGap:*, ncEps:*}>}
 */
exports.fetchNewConstructs = async (ticker, browser) => {
  const { fetchPdfData } = makeScrapeTools(ticker, browser)

  const [
    ncPeriodEndDateStr,
    [ncRating, ncRoic, ncFCF, ncEps, ncGap, ncPB] = [],
    isSuspended,
  ] = await fetchPdfData({
    analystName: NEW_CONSTRUCTS,
    url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
    xPathArr: [
      selfTextContains("for period ending"),
      `//span[text()="1 - Very Attractive" or text()="2 - Attractive" or text()="3 - Neutral"  or text()="4 - Unattractive" or text()="5 - Very Unattractive"]`,
      selfTextContains("Suspended"),
    ],
    waitForPostScroll: `//span[contains(text(),"Price-to-EBV Ratio is")]`,
    timeout: NEW_CONSTRUCTS_TIMEOUT,
  })

  const periodEndDate = ncPeriodEndDateStr ? last(ncPeriodEndDateStr.split(" ")) : ""

  return {
    ncUpdatedAt: makePrettyDate(),
    ncRatingB: "DEPRECATED",
    ncEps,
    ncFCF,
    ncGap,
    ncPB,
    ncRoic,
    ncRating,
    ncPeriodEndDate: isSuspended ? "***SUSPENDED***" : periodEndDate,
  }
}

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @param {string} url
 * @returns {Promise<Object>}
 */
exports.fetchZacks = async (ticker, browser, url) => {
  const { fetchPdfData } = makeScrapeTools(ticker, browser)

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
    timeout: ZACKS_TIMEOUT,
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
 * @param {string} ticker
 * @param {Browser} browser
 * @returns Promise<{fidelityEVIndustry:*, fidelityRevChngIndustryPct:*, fidelityOpMarginIndustryPct:*, fidelityRoAMrqIndustryPct:*, fidelityCurrentIndustry:*, fidelityIncomeEmploy:*, fidelityRevChngIndustry:*, fidelityPeFiveYrIndustry:*, fidelityPretaxMarginMrqIndustry:*, fidelityRoIIndustry:*, fidelityPayoutIndustryPct:*, fidelityDAMrqIndustry:*, fidelityPcf:*, fidelityRoAIndustry:*, fidelityRoIMrqIndustry:*, fidelityPayoutIndustry:*, fidelityPEGFiveYrIndustryPct:*, fidelityEpsGrowthYoYIndustryPct:*, fidelityEV:*, fidelityEpsGrowthYoY:*, fidelityEpsGrowthProj:*, fidelityPcfMrqIndustry:*, fidelityEpsGrowthProjIndustryPct:*, fidelityIncomeEmployIndustry:*, fidelityPBookIndustry:*, fidelityDA:*, fidelityEpsGrowthProjIndustry:*, fidelityLongDEMrqIndustryPct:*, fidelityDC:*, fidelityDE:*, fidelityRoIMrqIndustryPct:*, fidelityPEGFiveYrIndustry:*, fidelityPeIndustryPct:*, fidelityPayout:*, fidelityPeFiveYrIndustryPct:*, fidelityRoE:*, fidelityPBook:*, fidelityLongDEIndustry:*, fidelityRoEIndustryPct:*, fidelityRoI:*, fidelityLongDEMrq:*, fidelityLongDE:*, fidelityPeIndustry:*, fidelityProfitMarginMrqIndustryPct:*, fidelityCurrent:*, fidelityPSalesMrq:*, fidelityBookValueIndustryPct:*, fidelityGMargin:*, fidelityPretaxMarginMrqIndustryPct:*, fidelityEpsGrowth:*, fidelityPeFiveYr:*, fidelityEbitdMarginIndustryPct:*, fidelityDCIndustry:*, fidelityPSalesIndustry:*, fidelityRoeMrqIndustryPct:*, fidelityIncomeEmployIndustryPct:*, fidelityProfitMarginMrqIndustry:*, fidelityDEMrqIndustry:*, fidelityEVIndustryPct:*, fidelityEpsGrowthFiveYrIndustryPct:*, fidelityDCIndustryPct:*, fidelityPSalesMrqIndustry:*, fidelityGMarginIndustryPct:*, fidelityRevEmploy:*, fidelityDAMrq:*, fidelityRevChngYoYIndustry:*, fidelityRoAIndustryPct:*, fidelityDAMrqIndustryPct:*, fidelityCurrentIndustryPct:*, fidelityDEIndustryPct:*, fidelityCFlowGrowthFiveYrIndustryPct:*, fidelityLongDEIndustryPct:*, fidelityEpsGrowthProjLongIndustry:*, fidelityDCMrqIndustry:*, fidelityRevGrowthFiveYrIndustryPct:*, fidelityDEMrqIndustryPct:*, fidelityFcFIndustryPct:*, fidelityPretaxMargin:*, fidelityPSales:*, fidelityRevEmployIndustryPct:*, fidelityOpMarginMrq:*, fidelityGMarginMrqIndustry:*, fidelityBookGrowthFiveYr:*, fidelityRevChngYoY:*, fidelityRevChng:*, fidelityLongDEMrqIndustry:*, fidelityPSalesIndustryPct:*, fidelityEpsGrowthFiveYr:*, fidelityEpsGrowthProjLongIndustryPct:*, fidelityPBookIndustryPct:*, fidelityFcFIndustry:*, fidelityEpsGrowthIndustry:*, fidelityRoAMrqIndustry:*, fidelityBookGrowthFiveYrIndustry:*, fidelityDCMrq:*, fidelityBookValueIndustry:*, fidelityEpsGrowthYoYIndustry:*, fidelityBookValue:*, fidelityEbitdMarginIndustry:*, fidelityRevGrowthFiveYrIndustry:*, fidelityOpMargin:*, fidelityPretaxMarginIndustryPct:*, fidelityRoeMrq:*, fidelityPe:*, fidelityPcfIndustryPct:*, fidelityPretaxMarginIndustry:*, fidelityPcfMrq:*, fidelityGMarginMrqIndustryPct:*, fidelityDCMrqIndustryPct:*, fidelityFcF:*, fidelityPcfIndustry:*, fidelityOpMarginMrqIndustryPct:*, fidelityOpMarginMrqIndustry:*, fidelityDAIndustryPct:*, fidelityEbitdMargin:*, fidelityEpsGrowthFiveYrIndustry:*, fidelityBookGrowthFiveYrIndustryPct:*, fidelityCompustatLink:*, fidelityRoAMrq:*, fidelityRoA:*, fidelityRoIMrq:*, fidelityEpsGrowthIndustryPct:*, fidelityEpsGrowthProjLong:*, fidelityDAIndustry:*, fidelityProfitMarginMrq:*, fidelityCFlowGrowthFiveYrIndustry:*, fidelityRevChngYoYIndustryPct:*, fidelityGMarginMrq:*, fidelityOpMarginIndustry:*, fidelityDEMrq:*, fidelityPEGFiveYr:*, fidelityPcfMrqIndustryPct:*, fidelityRevGrowthFiveYr:*, fidelityRoeMrqIndustry:*, fidelityDEIndustry:*, fidelityPSalesMrqIndustryPct:*, fidelityCFlowGrowthFiveYr:*, fidelityPretaxMarginMrq:*, fidelityGMarginIndustry:*, fidelityRoEIndustry:*, fidelityRoIIndustryPct:*, fidelityRevEmployIndustry:*}>
 */
exports.fetchFidelityKeyStats = async (ticker, browser) => {
  const { getPageDataFetcher } = makeScrapeTools(ticker, browser)

  const fidelityKeyStatXpath = name =>
    `//div[@id="equity-key-statistics"]//tr[.//span[text()="${name}"]]/td/span`

  const fetcher = getPageDataFetcher(FIDELITY_STATS, { timeout: FIDELITY_STATS_TIMEOUT })
  await fetcher.setPage(
    `https://digital.fidelity.com/prgw/digital/research/quote/dashboard/key-statistics?stockspage=keyStatistics&symbols=${ticker}`
  )

  await fetcher.clickForXpath(`//*[@id="More"]`)

  const [
    [fidelityPrice],
    [, fidelityPe, fidelityPeIndustry] = [], // TTM, which is default vs. Mrq
    [, fidelityPeFiveYrAvg, fidelityPeFiveYrAvgIndustry] = [],
    [, fidelityPEGFiveYrProj, fidelityPEGFiveYrProjIndustry] = [],
    [, fidelityEV, fidelityEVIndustry] = [],
    [, fidelityPcfMrq, fidelityPcfMrqIndustry] = [],
    [, fidelityPcf, fidelityPcfIndustry] = [],
    [, fidelityPSalesMrq, fidelityPSalesMrqIndustry] = [],
    [, fidelityPSales, fidelityPSalesIndustry] = [],
    [, fidelityPBook, fidelityPBookIndustry] = [],
    [, fidelityBookValue, fidelityBookValueIndustry] = [],
    [, fidelityEpsGrowthYoY, fidelityEpsGrowthYoYIndustry] = [],
    [, fidelityEpsGrowth, fidelityEpsGrowthIndustry] = [], // ttm vs. prior ttm
    [, fidelityEpsGrowthFiveYr, fidelityEpsGrowthFiveYrIndustry] = [],
    [, fidelityEpsGrowthProj, fidelityEpsGrowthProjIndustry] = [],
    [, fidelityEpsGrowthProjLong, fidelityEpsGrowthProjLongIndustry] = [],
    [, fidelityRevChngYoY, fidelityRevChngYoYIndustry] = [],
    [, fidelityRevChng, fidelityRevChngIndustry] = [],
    [, fidelityRevGrowthFiveYr, fidelityRevGrowthFiveYrIndustry] = [],
    [, fidelityBookGrowthFiveYr, fidelityBookGrowthFiveYrIndustry] = [],
    [, fidelityFcF, fidelityFcFIndustry] = [],
    [, fidelityCFlowGrowthFiveYr, fidelityCFlowGrowthFiveYrIndustry] = [],
    [, fidelityGMarginMrq, fidelityGMarginMrqIndustry] = [],
    [, fidelityGMargin, fidelityGMarginIndustry] = [],
    [, fidelityEbitdMargin, fidelityEbitdMarginIndustry] = [],
    [, fidelityProfitMarginMrq, fidelityProfitMarginMrqIndustry] = [],
    [, fidelityOpMarginMrq, fidelityOpMarginMrqIndustry] = [],
    [, fidelityOpMargin, fidelityOpMarginIndustry] = [],
    [, fidelityPretaxMarginMrq, fidelityPretaxMarginMrqIndustry] = [],
    [, fidelityPretaxMargin, fidelityPretaxMarginIndustry] = [],
    [, fidelityRoeMrq, fidelityRoeMrqIndustry] = [],
    [, fidelityRoE, fidelityRoEIndustry] = [],
    [, fidelityRoAMrq, fidelityRoAMrqIndustry] = [],
    [, fidelityRoA, fidelityRoAIndustry] = [],
    [, fidelityRoIMrq, fidelityRoIMrqIndustry] = [],
    [, fidelityRoI, fidelityRoIIndustry] = [],
    [, fidelityLongDEMrq, fidelityLongDEMrqIndustry] = [],
    [, fidelityLongDE, fidelityLongDEIndustry] = [],
    [, fidelityDAMrq, fidelityDAMrqIndustry] = [],
    [, fidelityDA, fidelityDAIndustry] = [],
    [, fidelityDCMrq, fidelityDCMrqIndustry] = [],
    [, fidelityDC, fidelityDCIndustry] = [],
    [, fidelityDEMrq, fidelityDEMrqIndustry] = [],
    [, fidelityDE, fidelityDEIndustry] = [],
    [, fidelityCurrent, fidelityCurrentIndustry] = [],
    [, fidelityPayout, fidelityPayoutIndustry] = [],
    [, fidelityIncomeEmploy, fidelityIncomeEmployIndustry] = [],
    [, fidelityRevEmploy, fidelityRevEmployIndustry] = [],
    fidelityCompustatLink,
  ] = await fetcher.fetchPageData(
    [
      `//div[@class="nre-quick-quote-price"]`,
      fidelityKeyStatXpath("P/E (TTM)"),
      fidelityKeyStatXpath("P/E (5Y Average)"),
      fidelityKeyStatXpath("PEG Ratio (5Y Projected)"),
      fidelityKeyStatXpath("Enterprise Value"),
      fidelityKeyStatXpath("Price/Cash Flow (MRQ)"),
      fidelityKeyStatXpath("Price/Cash Flow (TTM)"),
      fidelityKeyStatXpath("Price/Sales (MRQ)"),
      fidelityKeyStatXpath("Price/Sales (TTM)"),
      fidelityKeyStatXpath("Price/Book"),
      fidelityKeyStatXpath("Book Value"),
      fidelityKeyStatXpath("EPS Growth (Last Qrtr vs. Same Qrtr Prior Yr)"),
      fidelityKeyStatXpath("EPS Growth (TTM vs. Prior TTM)"),
      fidelityKeyStatXpath("EPS Growth (Last 5 Yrs)"),
      fidelityKeyStatXpath("Projected EPS Growth (Next Yr vs. This Yr)"),
      fidelityKeyStatXpath("Forward EPS Long Term Growth (3-5 Yrs)"),
      fidelityKeyStatXpath("Revenue % Change (Last Qrtr vs. Same Qrtr Pr Yr)"),
      fidelityKeyStatXpath("Revenue % Change (TTM)"),
      fidelityKeyStatXpath("Revenue Growth (Last 5 Yrs)"),
      fidelityKeyStatXpath("Book Value per Share Growth (Last 5 Yrs)"),
      fidelityKeyStatXpath("Free Cash Flow (TTM)"),
      fidelityKeyStatXpath("Cash Flow Growth Rate (Last 5 Yrs)"),
      fidelityKeyStatXpath("Gross Margin (MRQ, Annualized)"),
      fidelityKeyStatXpath("Gross Margin (TTM)"),
      fidelityKeyStatXpath("EBITD Margin (TTM)"),
      fidelityKeyStatXpath("Profit Margin (MRQ)"),
      fidelityKeyStatXpath("Operating Margin (MRQ, Annualized)"),
      fidelityKeyStatXpath("Operating Margin (TTM)"),
      fidelityKeyStatXpath("Pretax Margin (MRQ, Annualized)"),
      fidelityKeyStatXpath("Pretax Margin (TTM)"),
      fidelityKeyStatXpath("Return on Equity (MRQ, Annualized)"),
      fidelityKeyStatXpath("Return on Equity (TTM)"),
      fidelityKeyStatXpath("Return on Assets (MRQ, Annualized)"),
      fidelityKeyStatXpath("Return on Assets (TTM)"),
      fidelityKeyStatXpath("Return on Investment (MRQ, Annualized)"),
      fidelityKeyStatXpath("Return on Investment (TTM)"),
      fidelityKeyStatXpath("Long Term Debt/Equity (MRQ, Annualized)"),
      fidelityKeyStatXpath("Long Term Debt/Equity (TTM)"),
      fidelityKeyStatXpath("Total Debt/Assets (MRQ, Annualized)"),
      fidelityKeyStatXpath("Total Debt/Assets (TTM)"),
      fidelityKeyStatXpath("Total Debt/Capital (MRQ)"),
      fidelityKeyStatXpath("Total Debt/Capital (TTM)"),
      fidelityKeyStatXpath("Total Debt/Equity (MRQ, Annualized)"),
      fidelityKeyStatXpath("Total Debt/Equity (TTM)"),
      fidelityKeyStatXpath("Current Ratio (TTM)"),
      fidelityKeyStatXpath("Payout Ratio (TTM)"),
      fidelityKeyStatXpath("Income/Employee (TTM)"),
      fidelityKeyStatXpath("Revenue/Employee (TTM)"),
      `//img[@title="MSCI Company Report"]/following-sibling::a/@href`,
    ],
    fidelityKeyStatXpath("Revenue/Employee (TTM)")
  )

  await fetcher.close()

  return mapValues(
    {
      fidelityStatsUpdatedAt: makePrettyDate(),
      fidelityPrice,
      fidelityPe,
      fidelityPeIndustry,
      fidelityPeRev: fidelityPrice / fidelityPe,
      fidelityPeFiveYrAvg,
      fidelityPeFiveYrAvgIndustry,
      fidelityPeFiveYrAvgRev: fidelityPrice / fidelityPeFiveYrAvg,
      fidelityPEGFiveYrProj,
      fidelityPEGFiveYrProjIndustry,
      fidelityPEGFiveYrProjRev: fidelityPrice / fidelityPEGFiveYrProj,
      fidelityEV,
      fidelityEVIndustry,
      fidelityPcfMrq,
      fidelityPcfMrqIndustry,
      fidelityPcfMrqRev: fidelityPrice / fidelityPcfMrq,
      fidelityPcf,
      fidelityPcfIndustry,
      fidelityPcfRev: fidelityPrice / fidelityPcf,
      fidelityPSalesMrq,
      fidelityPSalesMrqIndustry,
      fidelityPSalesMrqRev: fidelityPrice / fidelityPSalesMrq,
      fidelityPSales,
      fidelityPSalesIndustry,
      fidelityPSalesRev: fidelityPrice / fidelityPSales,
      fidelityPBook,
      fidelityPBookIndustry,
      fidelityPBookRev: fidelityPrice / fidelityPBook,
      fidelityBookValue,
      fidelityBookValueIndustry,
      fidelityEpsGrowthYoY,
      fidelityEpsGrowthYoYIndustry,
      fidelityEpsGrowth,
      fidelityEpsGrowthIndustry,
      fidelityEpsGrowthFiveYr,
      fidelityEpsGrowthFiveYrIndustry,
      fidelityEpsGrowthProj,
      fidelityEpsGrowthProjIndustry,
      fidelityEpsGrowthProjLong,
      fidelityEpsGrowthProjLongIndustry,
      fidelityRevChngYoY,
      fidelityRevChngYoYIndustry,
      fidelityRevChng,
      fidelityRevChngIndustry,
      fidelityRevGrowthFiveYr,
      fidelityRevGrowthFiveYrIndustry,
      fidelityBookGrowthFiveYr,
      fidelityBookGrowthFiveYrIndustry,
      fidelityFcF: millBillStrToNum(fidelityFcF),
      fidelityFcFIndustry: millBillStrToNum(fidelityFcFIndustry),
      fidelityCFlowGrowthFiveYr,
      fidelityCFlowGrowthFiveYrIndustry,
      fidelityGMarginMrq,
      fidelityGMarginMrqIndustry,
      fidelityGMargin,
      fidelityGMarginIndustry,
      fidelityEbitdMargin,
      fidelityEbitdMarginIndustry,
      fidelityProfitMarginMrq,
      fidelityProfitMarginMrqIndustry,
      fidelityOpMarginMrq,
      fidelityOpMarginMrqIndustry,
      fidelityOpMargin,
      fidelityOpMarginIndustry,
      fidelityPretaxMarginMrq,
      fidelityPretaxMarginMrqIndustry,
      fidelityPretaxMargin,
      fidelityPretaxMarginIndustry,
      fidelityRoeMrq,
      fidelityRoeMrqIndustry,
      fidelityRoE,
      fidelityRoEIndustry,
      fidelityRoAMrq,
      fidelityRoAMrqIndustry,
      fidelityRoA,
      fidelityRoAIndustry,
      fidelityRoIMrq,
      fidelityRoIMrqIndustry,
      fidelityRoI,
      fidelityRoIIndustry,
      fidelityLongDEMrq,
      fidelityLongDEMrqIndustry,
      fidelityLongDE,
      fidelityLongDEIndustry,
      fidelityDAMrq,
      fidelityDAMrqIndustry,
      fidelityDA,
      fidelityDAIndustry,
      fidelityDCMrq,
      fidelityDCMrqIndustry,
      fidelityDC,
      fidelityDCIndustry,
      fidelityDEMrq,
      fidelityDEMrqIndustry,
      fidelityDE,
      fidelityDEIndustry,
      fidelityCurrent,
      fidelityCurrentIndustry,
      fidelityPayout,
      fidelityPayoutIndustry,
      fidelityIncomeEmploy,
      fidelityIncomeEmployIndustry,
      fidelityRevEmploy,
      fidelityRevEmployIndustry,
      fidelityCompustatLink,
    },
    cleanFidelityStrings
  )
}

/**
 * @param {string} ticker
 * @param  {Browser} browser
 * @returns Promise<Object>
 */
exports.fetchFidelityAnalystOpinions = async (ticker, browser) => {
  const { getPageDataFetcher } = makeScrapeTools(ticker, browser)

  const formatFidelityStarmine = (name, rating) =>
    `${(name || "").substring(0, 14)} - ${rating}`

  const reportRowXpathFrag = name =>
    `//table[@data-tc="table-analyst-reports"]/tbody/tr[.//a="${name}"]`

  const fetcher = getPageDataFetcher(FIDELITY, {
    timeout: FIDELITY_ANALYST_TIMEOUT,
  })
  await fetcher.setPage(
    `https://digital.fidelity.com/prgw/digital/research/quote/dashboard/ratings-sentiment?symbols=${ticker}`
  )

  const [zacksDate, zacksLink, argusAnalystDate, argusAnalystLink] =
    await fetcher.fetchPageData([
      reportRowXpathFrag("Zacks Investment Research") + `/td[1]/time`,
      reportRowXpathFrag("Zacks Investment Research") + `/td[2]/a/@href`,
      reportRowXpathFrag("Argus Analyst") + `/td[1]/time`,
      reportRowXpathFrag("Argus Analyst") + `/td[2]/a/@href`,
    ])

  await fetcher.clickForXpath(`//*[@id="More"]`)

  const [starmines, fidelitySummaryScore] = await fetcher.fetchPageData([
    `//table[@data-tc="table-firm-opinions"]/tbody/tr/td[position()=1 or position()=3]//text()`,
    `//h2[contains(@class,'headingTwo')]/text()[5]`,
  ])

  const [
    fidelityStarmineOneName,
    fidelityStarmineOneRating,
    fidelityStarmineTwoName,
    fidelityStarmineTwoRating,
    fidelityStarmineThreeName,
    fidelityStarmineThreeRating,
    fidelityStarmineFourName,
    fidelityStarmineFourRating,
    fidelityStarmineFiveName,
    fidelityStarmineFiveRating,
  ] = starmines.filter(e => e.trim())

  await fetcher.close()

  const res = {
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
    argusAnalystDate,
    argusAnalystLink,
    zacksDate,
    zacksLink,
  }

  return res
}

/**
 * @param {string} ticker
 * @param {Object} cookie
 * @returns {Promise<*|null>}
 */
const getMoodysLink = async (ticker, cookie) => {
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
    const { data } = JSON.parse(text)
    if (data.ticker) {
      return `/search?keyword=${ticker}`
    }
    const org = data.organizations.find(org => org.ticker === ticker)
    return org ? org.link : null
  } catch (error) {
    return null
  }
}

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns Promise<Object>
 */
exports.fetchMoodysData = async (ticker, browser) => {
  const { getPageCookies, getPageDataFetcher } = makeScrapeTools(ticker, browser)

  const logger = new Logger(ticker, "Moodys")

  const moodysCookies = await getPageCookies("https://www.moodys.com/")
  const moodysLink = await getMoodysLink(ticker, moodysCookies)

  if (moodysLink) {
    const moodysFetcher = getPageDataFetcher("moodys", { timeout: MOODYS_TIMEOUT })
    await moodysFetcher.setPage(`https://www.moodys.com${moodysLink}`)
    const moodysData = await moodysFetcher.fetchPageData(
      [
        "//span[contains(text(),'LONG TERM RATING') or contains(text(),'LONG TERM DEBT')]/following-sibling::div[1]/a/div",
        "//span[contains(text(),'OUTLOOK')]/following-sibling::div[1]/a/div",
      ],
      `//div[@class="mis-ratings-container"]`
    )
    await moodysFetcher.close()
    return [...moodysData, moodysLink]
  } else {
    logger.warn("No Moodys link")
    return []
  }
}

/**
 * @param ticker {string}
 * @param tries {number}
 * @returns {Promise<{wsjChart,wsjShortPct,wsjShortChange}> | []}
 */
exports.fetchWSJData = async (ticker, tries = 0) => {
  const logger = new Logger(ticker, "WSJ")
  const url = `https://www.wsj.com/market-data/quotes/${ticker}`
  const fetchOpts = {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="101", "Opera";v="87"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      cookie:
        "ntvSession={}; gdprApplies=false; ccpaApplies=true; ab_uuid=de0489f2-963e-4eb2-98ca-a52476c9084d; usr_bkt=ixi4E5ylqa; consentUUID=8c8c9da3-a7fe-4dcb-972b-1f56eb41a3ff; AMCVS_CB68E4BA55144CAA0A4C98A5%40AdobeOrg=1; _scid=1b02f3e8-5e8f-4927-a59d-97fc33aa2e1f; _li_dcdm_c=.wsj.com; _lc2_fpi=7880a1137012--01fr13ccwmftb3st07ry82pv44; _ncg_id_=05485af1-fd1f-4bf5-848d-afd5394ae2fc; s_cc=true; cX_P=kxqf4b1tuzvpagn8; cX_S=kxqf4b1ykod78gsd; __gads=ID=607285d71f2a0cc4:T=1640714618:S=ALNI_MbIl7FPBNMfhHw8v_z3Zf4yHZ1jfw; permutive-id=8c7c2afa-10bf-46ff-88fa-02d960524f89; cX_G=cx%3Aovo0qshxwwfa3k62fyruhcteu%3A1cr8i5w8oghje; djvideovol=1; _sctr=1|1641974400000; _tq_id.TV-63639009-1.1fc3=f8028b4fc4aeaba0.1640714614.0.1642016365..; permutive-session=%7B%22session_id%22%3A%2236124c88-eca9-4a00-8340-c975082d0546%22%2C%22last_updated%22%3A%222022-01-12T19%3A39%3A26.072Z%22%7D; _pin_unauth=dWlkPU5qSTFNR0ZqTTJJdFpUY3dOQzAwTXpJeUxXRXdaVGN0Tm1ReVkyWmxNV013T1dNdw; has_optimizely=true; optimizelyEndUserId=oeu1652723895620r0.20432943885002075; _gcl_au=1.1.917510118.1652723906; _ncg_domain_id_=05485af1-fd1f-4bf5-848d-afd5394ae2fc.1.1652723902.1715795902; _ncg_g_id_=0e23c29c-24ef-43ac-8e8b-e800552b93e3.3.1652723906.1715795902; _fbp=fb.1.1652723906720.687917938; OB-USER-TOKEN=bce2d57a-c5ba-4076-b449-0832d27ab133; ki_t=1652723907067%3B1652723907067%3B1652723907067%3B1%3B1; ki_r=aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS8%3D; wsjregion=na%2Cus; _sp_v1_uid=1:86:a89d2c38-428e-471a-a3c9-0c7674727a8b; _sp_v1_ss=1:H4sIAAAAAAAAAItWqo5RKimOUbLKK83J0YlRSkVil4AlqmtrlXSoqiwWACMYp9h2AAAA; _sp_v1_opt=1:; _sp_v1_csv=null; _sp_v1_lt=1:; DJSESSION=country%3Dus%7C%7Ccontinent%3Dna%7C%7Cregion%3Dca%7C%7Ccity%3Dlosangeles%7C%7Clatitude%3D33.9733%7C%7Clongitude%3D-118.2487%7C%7Ctimezone%3Dpst%7C%7Czip%3D90001-90068%2B90070-90084%2B90086-90089%2B90091%2B90093-90096%2B90099%2B90189; _am_sp_djcsses.1fc3=*; _ncg_sp_ses.5378=*; hok_seg=none; usr_prof_v2=eyJwIjp7InBzIjowLjE4LCJxIjowLjY0fSwiaWMiOjN9; utag_main=v_id:017e02362e88001a2784f58351b70508a003c08200fb8$_sn:9$_se:6$_ss:0$_st:1656090900214$vapi_domain:wsj.com$ses_id:1656088691449%3Bexp-session$_pn:6%3Bexp-session$_prevpage:WSJ_ResearchTools_Market%20Data%20Center_Quotes_Researchratings%3Bexp-1656092700217; AMCV_CB68E4BA55144CAA0A4C98A5%40AdobeOrg=1585540135%7CMCIDTS%7C19168%7CMCMID%7C39225633381824831580398283561946864765%7CMCAAMLH-1653328698%7C9%7CMCAAMB-1656088690%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1656096300s%7CNONE%7CMCAID%7CNONE%7CMCSYNCSOP%7C411-18997%7CvVersion%7C4.4.0; _am_sp_djcsid.1fc3=0c0a91fb-7da9-4be8-869a-5d65d13b78a8.1640714613.9.1656089100.1655832844.523064c4-119f-4e89-a9e8-00570f0ce9f8; _ncg_sp_id.5378=05485af1-fd1f-4bf5-848d-afd5394ae2fc.1640714614.9.1656089100.1655832844.86faec17-ff7b-4b02-a8b2-822f3b4bc39c; s_tp=2648; s_ppv=WSJ_ResearchTools_Market%2520Data%2520Center_Quotes_Researchratings%2C51%2C51%2C1340; _sp_v1_data=2:371407:1655829925:0:9:0:9:0:0:_:-1",
      Referer: "https://docs.google.com/",
      "Referrer-Policy": "origin",
    },
    body: null,
    method: "GET",
  }

  try {
    const [mainPage, researchPage, financialsPage] = await Promise.stagger(
      fetchText,
      [
        [url, fetchOpts],
        [url + "/research-ratings", fetchOpts],
        [url + "/financials", fetchOpts],
      ],
      800
    )
    const researchPageDoc = Cheerio.load(/**@type * */ researchPage)
    const html = researchPageDoc(".cr_analystRatings .data_data")

    const mainPageDoc = Cheerio.load(/**@type * */ mainPage)
    const financialsPageDoc = Cheerio.load(/**@type * */ financialsPage)

    const wsjShortDateRaw = mainPageDoc(`h3:contains("Short Interest ") span`).text()
    const wsjShortDate = wsjShortDateRaw
      ? wsjShortDateRaw.replace("(", "").replace(")", "")
      : wsjShortDateRaw

    const retVal = {
      wsjUpdatedAt: makePrettyDate(),
      wsjChart: html
        .contents()
        .get()
        .map(node => node.data),
      wsjShortPct: mainPageDoc(`h5:contains("Percent of Float")`).next().text(),
      wsjShortChange: mainPageDoc(`h5:contains("Change from Last")`).next().text(),
      wsjShortDate,
      wsjLastEarningsDate: financialsPageDoc(`span.data_lbl:contains("Last Report")`)
        .next()
        .text(),
      wsjNextEarningsDate: financialsPageDoc(`span.data_lbl:contains("Next Report")`)
        .next()
        .text(),
    }

    if (retVal.wsjChart.length === 0 && tries < 6) {
      logger.error("NO CHART!")

      const shouldHaveChart =
        stockData[ticker]?.wsjChartCurrent.length !== 0 ||
        vooData[ticker]?.wsjChartCurrent.length !== 0

      if (shouldHaveChart || tries < 3) {
        logger.error("RETRY WSJ!")
        await pause(1000 * tries)
        return exports.fetchWSJData(ticker, tries + 1)
      }
    }

    logger.completeOk("Done")

    return retVal
  } catch (err) {
    logger.error("General script error: " + err)
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

/**
 * @param {string} ticker
 * @param {string} cfraRating
 * @param {string} cfraLink
 * @param {Browser} browser
 * @returns {Promise<{cfraTarget:string, cfraFairValue:*, cfraUpdatedAt:(*|string), cfraDate:*}>}
 */
exports.fetchCFRAData = async (ticker, cfraRating, cfraLink, browser) => {
  const { fetchPdfData } = makeScrapeTools(ticker, browser)

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
        timeout: CFRA_TIMEOUT,
      })
    : []

  return {
    cfraTarget: extractNumbers(cfraTargetStr),
    cfraFairValue,
    cfraDate,
    cfraUpdatedAt: makePrettyDate(),
  }
}

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<{boaIncome:*, morningstarLink:(string|string[]), boaInvestment:*, cfraRating:*, boaRating:*, morningstarRating:*, boaVolatility:*, cfraLink:(string|string[])}>}
 */
exports.fetchBoaData = async (ticker, browser) => {
  const { getPageDataFetcher } = makeScrapeTools(ticker, browser)

  const boaFetcher = getPageDataFetcher(BOA, { timeout: BOA_TIMEOUT })
  await boaFetcher.setPage(
    `https://olui2.fs.ml.com/RIStocksUI/RIStocksOverview.aspx?Symbol=${ticker}&ref=RUN_RIPortfolioStoryUI_PortfolioStory&src=ql`
  )
  const [boaRating, [boaVolatility, boaInvestment, boaIncome] = []] =
    await boaFetcher.fetchPageData([
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

/**
 *
 * @param {string} ticker
 * @param {string} url
 * @param {Browser} browser
 * @returns {Promise<{argusAnalystOneYrDivGrowth:*, argusAnalystFiveYrEpsGrowth:*, argusAnalystRating:*, argusAnalystTarget:(number|string), argusAnalystFinancialStrength:*, argusAnalystOneYrEpsGrowth:*}>}
 */
exports.fetchArgusAnalyst = async (ticker, url, browser) => {
  const { fetchPdfData } = makeScrapeTools(ticker, browser)

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
    timeout: ARGUS_ANALYST_TIMEOUT,
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

/**
 * @param {string} ticker
 * @param {string} url
 * @param {Browser} browser
 * @returns {Promise<{morningstarFairValue:*, morningstarUncertainty:*, morningstarDate:*, morningstarCapitalAllocation:*, morningstarMoat:*}>}
 */
exports.fetchMorningstarData = async (ticker, url, browser) => {
  const { fetchPdfData } = makeScrapeTools(ticker, browser)

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
      prevSiblingTextIs("USD", 2),
      followingSiblingTextIs("Price vs. Fair Value ", 4),
      followingSiblingTextIs("Price vs. Fair Value ", 2),
      followingSiblingTextIs("Price vs. Fair Value ", 1),
      prevSiblingTextIs("Capital Allocation", 6),
    ],
    timeout: MORNINGSTAR_TIMEOUT,
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

exports.exportsForTest = {
  getHedgeRating,
}
