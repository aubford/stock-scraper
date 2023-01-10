const { makePrettyDate } = require("../util")
const PageDataFetcher = require("../PageDataFetcher")

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @param {string} url
 * @returns {Promise<Object>}
 */
exports.fetch = async (ticker, browser, analystPageLink) => {
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
