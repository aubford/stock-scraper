const { makePrettyDate } = require("../util")
const JsDomFetcher = require("../JsDomFetcher")
const { containsChars, selfTextContains, textContainsPredicate } = require("./util/xpath")
const { fetchJson } = require("./util/www")
const Logger = require("../Logger")

const ZACKS = "Zacks"

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
      // zacks_rank,
      last: zacksPrice,
    },
  } = res

  const fetcher = new JsDomFetcher(ZACKS, ticker)

  // DETAILED EARNINGS ESTIMATES ///////////

  await fetcher.setPage(
    `https://www.zacks.com/stock/quote/${ticker}/detailed-earning-estimates`
  )

  // detailed estimates

  const detailSection = fetcher.$x(`//section[@id="detail_estimate"]/table`)
  const detailXpath = text =>
    detailSection.getTextByX(
      `//${textContainsPredicate("td", text)}/following-sibling::*/span`
    )

  const zacksReportDate = detailXpath("Exp Earnings Date")
  const zacksEpsEstimateCurrentYr = detailXpath("Current Year")
  const zacksEpsEstimateNextYr = detailXpath("Next Year")
  const zacksAvgAnalystRatingOutOfFive = detailSection.getTextByX(
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

  // STYLE SCORES ///////////////////////////

  await fetcher.setPage(`https://www.zacks.com/stock/research/${ticker}/stock-style-scores`)

  const [zacksValue, zacksGrowth, zacksMomentum] = fetcher.getTextArrByX(`//thead//th[2]/span`)
  const all = fetcher.getTextArrByX(`//tbody[2]/tr/td[2]`)
  const [
    zacksRank,
    zacksVGM,
    zacksCashPrice,
    zacksEVEbitda,
    zacksPegTTM,
    zacksPB,
    zacksPCF,
    ,
    ,
    zacksEarningsYield,
    zacksDebtEquity,
    zacksCashFlowPerShare,
    ,
    ,
    zacksHistEpsGrowth,
    zacksProjEpsGrowth,
    zacksCurrCashFlowGrowth,
    zacksHistCashFlowGrowth,
    zacksCurrentRatio,
    zacksDebtCapital,
    zacksNetMargin,
    zacksROE,
    zacksSalesToAssets,
    zacksProjSalesGrowth,
  ] = all

  // RESULT /////////////////////////////////

  return {
    // zacksTarget, where to find?
    // zacksIndustryRank, meh...
    zacksUpdatedAt: makePrettyDate(),
    zacksLastDividendAnnu: dividend * dividend_freq,
    zacksGrowthEstimatePctYr,
    zacksGrowthEstimatePctYrInd,
    zacksGrowthEstimatePctNextYr,
    zacksGrowthEstimatePctNextYrInd,
    zacksGrowthEstimatePctFiveYr,
    zacksGrowthEstimatePctFiveYrInd,
    zacksEstimateChangePctWeek: currentEpsEstimateSum / weekEpsEstimateSum - 1,
    zacksEstimateChangePctMonth: currentEpsEstimateSum / monthEpsEstimateSum - 1,
    zacksEstimateChangePctBiMonth: currentEpsEstimateSum / biMonthEpsEstimateSum - 1,
    zacksPastWeekRevisionSum:
      weekRevisionsQtr +
      weekRevisionsNextQtr +
      weekRevisionsYr +
      weekRevisionsNextYr -
      (weekRevisionsQtrDown +
        weekRevisionsNextQtrDown +
        weekRevisionsYrDown +
        weekRevisionsNextYrDown),
    zacksPastMonthRevisionSum:
      monthRevisionsQtr +
      monthRevisionsNextQtr +
      monthRevisionsYr +
      monthRevisionsNextYr -
      (monthRevisionsQtrDown +
        monthRevisionsNextQtrDown +
        monthRevisionsYrDown +
        monthRevisionsNextYrDown),
    zacksRank,
    zacksEpsTTM,
    zacksEpsEstimateCurrentYr,
    zacksEpsEstimateNextYr,
    zacksAvgAnalystRatingOutOfFive,
    zacksEarningsEsp,
    zacksCashPrice,
    zacksVGM,
    zacksValue,
    zacksGrowth,
    zacksMomentum,
    zacksEVEbitda,
    zacksEgPerShareTTM: zacksPrice / zacksPegTTM,
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

exports.fetch = ticker => {
  const logger = new Logger(ticker, ZACKS)
  try {
    return fetch(ticker)
  } catch (error) {
    logger.error(error)
  }
}

// fetch("AVGO").then(res => console.log(res))
