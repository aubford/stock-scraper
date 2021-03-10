const Cheerio = require("cheerio")
const { prevSiblingTextContains, prevSiblingTextIs } = require("./util")

/**
 * @typedef ApiCall
 * @function
 * @param {string} ticker
 * @param {ScrapeTools} scrapeTools
 * @param {string} url
 * @returns Promise<Object>
 */

/**
 * @returns {Promise<string>}
 */
const fetchText = async (...fetchArgs) => {
  const response = await fetch(...fetchArgs)
  return await response.text()
}

// MOODYS

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
  const data = JSON.parse(text).data.organizations[0]
  return data && data.ticker === ticker ? data : null
}

// WSJ

exports.fetchWSJData = async ticker => {
  const url = `https://www.wsj.com/market-data/quotes/${ticker}/research-ratings`
  try {
    const text = await fetchText(url)
    const $ = Cheerio.load(text)
    const html = $(".cr_analystRatings .data_data")
    return html
      .contents()
      .get()
      .map(node => node.data)
  } catch (err) {
    console.error("WSJ ERROR: ", err)
    return []
  }
}

// YAHOO

exports.fetchYahooData = async ticker => {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${YAHOO_MODULES.join(
    ","
  )}`
  const text = await fetchText(url)
  return JSON.parse(text)
}

// ALPHA VANTAGE

const avApiKey = "1FSCTLZ457VMJH2F"
const avUrl = "https://www.alphavantage.co/query?function="
exports.fetchAlphaVantageData = async (ticker, func) => {
  const text = await fetchText(avUrl + func + "&symbol=" + ticker + "&apikey=" + avApiKey)
  return JSON.parse(text)
}

// IEX

const iexToken = "Tsk_05e3881c9446499bac9b6778ca0c2f8e"
exports.fetchIEXData = async (ticker, datum) => {
  const url = `https://sandbox.iexapis.com/stable/data-points/${ticker}/${datum}?token=${iexToken}`
  const text = await fetchText(url)
  return JSON.parse(text)
}

// NEW CONSTRUCTS

/** @type ApiCall */
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
    waitForPostScroll: `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]`,
  })

  if (ncRating !== ncRatingB) {
    console.error("New Constructs rating mismatch!!!!!!")
    return {}
  }

  return {
    ncEps,
    ncFCF,
    ncGap,
    ncPB,
    ncRating,
    ncRoic,
  }
}

/** @type ApiCall */
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
    ],
  })

  return {
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
  }
}

const fidelityKeyStatXpath = name =>
  `//div[@id="audit-integrity"]/table//tr[contains(td,"${name}")]/td[contains(@class,"right")]`

/** @type ApiCall */
exports.fetchFidelityKeyStats = async (ticker, { PageDataFetcher }) => {
  const fetcher = new PageDataFetcher(FIDELITY_STATS)
  await fetcher.setPage(
    `https://eresearch.fidelity.com/eresearch/evaluate/fundamentals/keyStatistics.jhtml?stockspage=keyStatistics&symbols=${ticker}`
  )

  const [
    [fidelityPe, fidelityPeIndustry, fidelityPeIndustryPct] = [], // TTM, which is default vs. Mrq
    [fidelityPeFiveYr, fidelityPeFiveYrIndustry, fidelityPeFiveYrIndustryPct] = [],
    [fidelityPEGFiveYr, fidelityPEGFiveYrIndustry, fidelityPEGFiveYrIndustryPct] = [],
    [fidelityEV, fidelityEVIndustry, fidelityEVIndustryPct] = [],
    [fidelityPcfMrq, fidelityPcfMrqIndustry, fidelityPcfMrqIndustryPct] = [],
    [fidelityPcf, fidelityPcfIndustry, fidelityPcfIndustryPct] = [],
    [fidelityPSalesMrq, fidelityPSalesMrqIndustry, fidelityPSalesMrqIndustryPct] = [],
    [fidelityPSales, fidelityPSalesIndustry, fidelityPSalesIndustryPct] = [],
    [fidelityPBook, fidelityPBookIndustry, fidelityPBookIndustryPct] = [],
    [fidelityBookValue, fidelityBookValueIndustry, fidelityBookValueIndustryPct] = [],
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

  return {
    fidelityPe,
    fidelityPeIndustry,
    fidelityPeIndustryPct,
    fidelityPeFiveYr,
    fidelityPeFiveYrIndustry,
    fidelityPeFiveYrIndustryPct,
    fidelityPEGFiveYr,
    fidelityPEGFiveYrIndustry,
    fidelityPEGFiveYrIndustryPct,
    fidelityEV,
    fidelityEVIndustry,
    fidelityEVIndustryPct,
    fidelityPcfMrq,
    fidelityPcfMrqIndustry,
    fidelityPcfMrqIndustryPct,
    fidelityPcf,
    fidelityPcfIndustry,
    fidelityPcfIndustryPct,
    fidelityPSalesMrq,
    fidelityPSalesMrqIndustry,
    fidelityPSalesMrqIndustryPct,
    fidelityPSales,
    fidelityPSalesIndustry,
    fidelityPSalesIndustryPct,
    fidelityPBook,
    fidelityPBookIndustry,
    fidelityPBookIndustryPct,
    fidelityBookValue,
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
    fidelityFcF,
    fidelityFcFIndustry,
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
  }
}
