const { isString, mapValues } = require("lodash")
const PageDataFetcher = require("../fetchers/PageDataFetcher")
const { makePrettyDate } = require("../util")
const { millBillStrToNum } = require("./util")
const { handleFetch } = require("./util/www")

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
 *
 * @param {string} ticker
 * @param {Browser} browser
 * @param {object} logger
 * @returns {Promise<*>}
 */
const fetchData = async (ticker, browser, logger) => {
  const fidelityKeyStatXpath = name =>
    `//div[@id="equity-key-statistics"]//tr[.//span[text()="${name}"]]/td/span`

  const fetcher = new PageDataFetcher(ticker, browser, logger, {
    timeout: FIDELITY_STATS_TIMEOUT,
  })
  await fetcher.setPage(
    `https://digital.fidelity.com/prgw/digital/research/quote/dashboard/key-statistics?stockspage=keyStatistics&symbols=${ticker}`
  )

  await fetcher.clickForXpath(`//*[@href="#pvd3-action__caret-right"]`)

  const [
    [fidelityPrice] = [],
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

exports.fetch = (ticker, browser) =>
  handleFetch(logger => fetchData(ticker, browser, logger), ticker, FIDELITY_STATS)
