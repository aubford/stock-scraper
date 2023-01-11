const { makePrettyDate } = require("../util")
const JsDomFetcher = require("../JsDomFetcher")
const { containsChars, selfTextContains, textContainsPredicate } = require("./util/xpath")
const { fetchJson } = require("./util/www")
const Logger = require("../Logger")

// todo: remove
const ZACKS = "ZACKS"

const getEstmiateSum = tableRowCellArr =>
  tableRowCellArr.slice(0, 3).reduce((acc, curr) => {
    return acc + Number(curr)
  }, 0)

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @param {string} url
 * @returns {Promise<Object>}
 */
const fetch = async ticker => {
  const res = await fetchJson(`https://quote-feed.zacks.com/index.php?t=${ticker}`)
  const {
    [ticker]: {
      source: {
        sungard: { earnings: zacksEpsTTM, dividend, dividend_freq },
      },
      zacks_rank,
      last: zacksPrice,
    },
  } = res

  const fetcher = new JsDomFetcher(ZACKS, ticker)

  // Detailed Earnings Estimates ///////////

  await fetcher.setPage(
    `https://www.zacks.com/stock/quote/${ticker}/detailed-earning-estimates`
  )

  // detailed estimates

  const detailSection = fetcher.$x(`//section[@id="detail_estimate"]/table`)
  const detailXpath = text =>
    detailSection.getTextByX(
      `//${textContainsPredicate("td", text)}/following-sibling::*/span`
    )

  const zacksEarningsDate = detailXpath("Exp Earnings Date")
  const zacksEpsYr = detailXpath("Current Year")
  const zacksEpsNextYr = detailXpath("Next Year")
  const zacksAvgAnalystRating = detailSection.getTextByX(
    `//${textContainsPredicate("a", "ABR")}/../following-sibling::*/span`
  )
  const zacksEarningsEsp = detailSection.getTextByX(
    `//td/a[@class='newwin' and text()='Earnings ESP']/../following-sibling::*`
  )

  // revisions

  const tableRowXpath = title => `//td[text()='${title}']/following-sibling::td`

  const [weekRevisionsQtr, weekRevisionsNextQtr, weekRevisionsYr, weekRevisionsNextYr] =
    fetcher.getTextArrByX(tableRowXpath("Up Last 7 Days"))
  const [
    weekRevisionsQtrDown,
    weekRevisionsNextQtrDown,
    weekRevisionsYrDown,
    weekRevisionsNextYrDown,
  ] = fetcher.getTextArrByX(tableRowXpath("Down Last 7 Days"))
  const [monthRevisionsQtr, monthRevisionsNextQtr, monthRevisionsYr, monthRevisionsNextYr] =
    fetcher.getTextArrByX(tableRowXpath("Up Last 30 Days"))
  const [
    monthRevisionsQtrDown,
    monthRevisionsNextQtrDown,
    monthRevisionsYrDown,
    monthRevisionsNextYrDown,
  ] = fetcher.getTextArrByX(tableRowXpath("Down Last 30 Days"))

  const currentEpsEstimateSum = getEstmiateSum(fetcher.getTextArrByX(tableRowXpath("Current")))
  const weekEpsEstimateSum = getEstmiateSum(fetcher.getTextArrByX(tableRowXpath("7 Days Ago")))
  const monthEpsEstimateSum = getEstmiateSum(
    fetcher.getTextArrByX(tableRowXpath("30 Days Ago"))
  )
  const biMonthEpsEstimateSum = getEstmiateSum(
    fetcher.getTextArrByX(tableRowXpath("60 Days Ago"))
  )

  // growth estimates

  const [zacksGrowthEstimatePctYr, zacksGrowthEstimatePctYrInd] = fetcher.getTextArrByX(
    `//td[${containsChars("Current Year (")}]/following-sibling::td`
  )
  const [zacksGrowthEstimatePctNextYr, zacksGrowthEstimatePctNextYrInd] =
    fetcher.getTextArrByX(`//td[${containsChars("Next Year (")}]/following-sibling::td`)
  const [zacksGrowthEstimatePctFiveYr, zacksGrowthEstimatePctFiveYrInd] =
    fetcher.getTextArrByX(`//td[${containsChars("Next 5 Years")}]/following-sibling::td`)

  // Result /////////////////////////////////

  // const zacksPrice = Number(zacksPriceStrClean) || ""

  return {
    zacksUpdatedAt: makePrettyDate(),
    zacksLastDividendAnnu: dividend * dividend_freq,
    zacksGrowthEstimatePctYr,
    zacksGrowthEstimatePctYrInd,
    zacksGrowthEstimatePctNextYr,
    zacksGrowthEstimatePctNextYrInd,
    zacksGrowthEstimatePctFiveYr,
    zacksGrowthEstimatePctFiveYrInd,
    zacksEstimateChangeWeek: currentEpsEstimateSum / weekEpsEstimateSum - 1,
    zacksEstimateChangeMonth: currentEpsEstimateSum / monthEpsEstimateSum - 1,
    zacksEstimateChangeBiMonth: currentEpsEstimateSum / biMonthEpsEstimateSum - 1,
    zacksweekRevisions:
      weekRevisionsQtr +
      weekRevisionsNextQtr +
      weekRevisionsYr +
      weekRevisionsNextYr -
      (weekRevisionsQtrDown +
        weekRevisionsNextQtrDown +
        weekRevisionsYrDown +
        weekRevisionsNextYrDown),
    zacksMonthRevisions:
      monthRevisionsQtr +
      monthRevisionsNextQtr +
      monthRevisionsYr +
      monthRevisionsNextYr -
      (monthRevisionsQtrDown +
        monthRevisionsNextQtrDown +
        monthRevisionsYrDown +
        monthRevisionsNextYrDown),
    zacksRank: zacks_rank,
    zacksEarningsDate,
    zacksEpsYr,
    zacksEpsNextYr,
    zacksAvgAnalystRating,
    zacksEarningsEsp,
    zacksEpsTTM,
    // zacksTarget,
    // zacksRecommendation,
    // zacksVGM,
    // zacksValue,
    // zacksGrowth,
    // zacksMomentum,
    // zacksIndustryRank,
    // zacksExpectedReportDate,
    // zacksQuarterlyEps,
    // zacksAnnualEps,
    // zacksEVEbitda,
    // zacksEgPerShare: zacksPrice / zacksPEG,
    // zacksPB,
    // zacksBookPerShare: zacksPrice / zacksPB,
    // zacksPCF,
    // zacksEarningsYield,
    // zacksDebtEquity,
    // zacksCashFlowPerShare,
    // zacksHistEpsGrowth, // 3-5 years
    // zacksProjEpsGrowth,
    // zacksCurrCashFlowGrowth,
    // zacksHistCashFlowGrowth,
    // zacksCurrentRatio,
    // zacksDebtCapital,
    // zacksNetMargin,
    // zacksROE,
    // zacksSalesToAssets,
    // zacksProjSalesGrowth,
    zacksPrice,
    // zacksReportDate,
  }
}

exports.fetch = ticker => {
  const logger = new Logger(ticker, ZACKS)
  try {
    return fetch(ticker)
  } catch (error) {
    logger.error(error)
  }
}

fetch("AVGO")
