const { makePrettyDate, ReError, formatErrorObject } = require("../util")
const JsDomFetcher = require("../JsDomFetcher")
const { containsChars, textContainsPredicate } = require("./util/xpath")
const { fetchJson, handleFetch } = require("./util/www")
const Logger = require("../Logger")
const { orderBy, sum } = require("lodash")

const getEstimateSum = tableRowCellArr =>
  tableRowCellArr.slice(0, 3).reduce((acc, curr) => {
    return acc + Number(curr)
  }, 0)

const getMainData = async (ticker, logger) => {
  try {
    const mainData = await fetchJson(`https://quote-feed.zacks.com/index.php?t=${ticker}`)
    const {
      [ticker]: {
        source: {
          sungard: {
            earnings: zacksEpsTTM,
            dividend,
            close: zacksPriceLastClose,
            dividend_freq,
          },
        },
        confirmed_reporting_date,
        expected_reporting_date,
      },
    } = mainData

    return {
      zacksEpsTTM,
      dividend,
      zacksPriceLastClose,
      dividend_freq,
      confirmed_reporting_date,
      expected_reporting_date,
    }
  } catch (e) {
    throw new ReError("Failed to fetch mainData", e, "getMainData").setCode(404)
  }
}

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @param {string} url
 * @returns {Promise<Object>}
 */
const fetchData = async (logger, ticker) => {
  const {
    zacksEpsTTM,
    dividend,
    zacksPriceLastClose,
    dividend_freq,
    confirmed_reporting_date,
    expected_reporting_date,
  } = await getMainData(ticker, logger)

  const zacksEstimatedNextEarningsDate = new Date(expected_reporting_date * 1000)
    .toLocaleString()
    .split(",")[0]
  const zacksConfirmedNextEarningsDate = confirmed_reporting_date

  // just using this to get earnings calendar
  const { eps_surprise } = await fetchJson(
    `https://www.zacks.com//data_handler/charts/?ticker=${ticker}&wrapper=price_and_eps_surprise&addl_settings=`
  )
  const epsSurprises = eps_surprise
    ? orderBy(Object.entries(eps_surprise), Date).filter(i => i[1] !== "N/A")
    : [[]]

  const fetcher = new JsDomFetcher("Zacks", ticker)

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

  const zacksEpsEstimateCurrentYr = detailXpath("Current Year")
  const zacksEpsEstimateNextYr = detailXpath("Next Year")
  const zacksAvgAnalystRatingOutOfFive = detailSection.getTextByX(
    `//${textContainsPredicate("a", "ABR")}/../following-sibling::*/span`
  )
  const zacksEarningsESP = detailSection.getTextByX(
    `//td/a[@class='newwin' and text()='Earnings ESP']/../following-sibling::*`
  )

  // revisions

  const tableRowXpath = title => `//td[text()='${title}']/following-sibling::td`

  const weekRevisionsUp = sum(
    fetcher.getTextArrByX(tableRowXpath("Up Last 7 Days")).map(Number)
  )
  const weekRevisionsDown = sum(
    fetcher.getTextArrByX(tableRowXpath("Down Last 7 Days")).map(Number)
  )
  const monthRevisionsUp = sum(
    fetcher.getTextArrByX(tableRowXpath("Up Last 30 Days")).map(Number)
  )
  const monthRevisionsDown = sum(
    fetcher.getTextArrByX(tableRowXpath("Down Last 30 Days")).map(Number)
  )

  const zacksCurrentEpsEstimateSum = getEstimateSum(
    fetcher.getTextArrByX(tableRowXpath("Current"))
  )
  const zacksWeekEpsEstimateSum = getEstimateSum(
    fetcher.getTextArrByX(tableRowXpath("7 Days Ago"))
  )
  const zacksMonthEpsEstimateSum = getEstimateSum(
    fetcher.getTextArrByX(tableRowXpath("30 Days Ago"))
  )
  const zacksBiMonthEpsEstimateSum = getEstimateSum(
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
  const [
    zacksRank,
    zacksVGM,
    zacksCashPrice,
    zacksEVEbitda,
    zacksPegTTM,
    zacksPB,
    ,
    ,
    zacksPriceToSales,
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
  ] = fetcher.getTextArrByX(`//tbody[2]/tr/td[2]`)

  const [
    ,
    ,
    ,
    zacksEVEbitdaIndustry,
    zacksPegTTMIndustry,
    zacksPBIndustry,
    zacksPCFIndustry,
    zacksPEIndustry,
    zacksPriceToSalesIndustry,
    zacksEarningsYieldIndustry,
    zacksDebtEquityIndustry,
    ,
    ,
    ,
    zacksHistEpsGrowthIndustry,
    zacksProjEpsGrowthIndustry,
    zacksCurrCashFlowGrowthIndustry,
    zacksHistCashFlowGrowthIndustry,
    zacksCurrentRatioIndustry,
    zacksDebtCapitalIndustry,
    zacksNetMarginIndustry,
    zacksROEIndustry,
    zacksSalesToAssetsIndustry,
    zacksProjSalesGrowthIndustry,
  ] = fetcher.getTextArrByX(`//tbody[2]/tr/td[3]`)

  const zacksEpsSurprise = epsSurprises[0]?.[1]

  // RESULT /////////////////////////////////

  return {
    zacksUpdatedAt: makePrettyDate(),
    zacksLastDividendAnnu: dividend * dividend_freq,

    zacksCurrentEpsEstimateSum,
    zacksWeekEpsEstimateSum,
    zacksMonthEpsEstimateSum,
    zacksBiMonthEpsEstimateSum,
    zacksEstimateChangePctWeek:
      ((zacksCurrentEpsEstimateSum - zacksWeekEpsEstimateSum) /
        Math.abs(zacksWeekEpsEstimateSum)) *
      100,
    zacksEstimateChangePctMonth:
      ((zacksCurrentEpsEstimateSum - zacksMonthEpsEstimateSum) /
        Math.abs(zacksMonthEpsEstimateSum)) *
      100,
    zacksEstimateChangePctBiMonth:
      ((zacksCurrentEpsEstimateSum - zacksBiMonthEpsEstimateSum) /
        Math.abs(zacksBiMonthEpsEstimateSum)) *
      100,

    zacksPastWeekRevisionSum: weekRevisionsUp - weekRevisionsDown,
    zacksPastMonthRevisionSum: monthRevisionsUp - monthRevisionsDown,

    zacksRank,
    zacksVGM,
    zacksValue,
    zacksGrowth,
    zacksMomentum,
    zacksAvgAnalystRatingOutOfFive,

    zacksPriceLastClose,

    zacksEarningsESP,
    zacksEpsSurprise,
    zacksEpsTTM,
    zacksEpsEstimateCurrentYr,
    zacksEpsEstimateNextYr,
    zacksPEIndustry,

    zacksEgPerShareTTM: zacksPriceLastClose / zacksPegTTM,
    zacksPegTTMIndustry,

    zacksBookPerShare: zacksPriceLastClose / zacksPB,
    zacksPBIndustry,

    zacksCashFlowPerShare,
    zacksPCFIndustry,

    zacksSalesPerShare: zacksPriceLastClose / zacksPriceToSales,
    zacksPriceToSalesIndustry,

    zacksProjSalesGrowth,
    zacksProjSalesGrowthIndustry,

    zacksCashPrice,
    zacksHistEpsGrowth: zacksHistEpsGrowth + ` (${zacksHistEpsGrowthIndustry})`, // 3-5 years
    zacksProjEpsGrowth: zacksProjEpsGrowth + ` (${zacksProjEpsGrowthIndustry})`,
    zacksEVEbitda: zacksEVEbitda + ` (${zacksEVEbitdaIndustry})`,
    zacksEarningsYield: zacksEarningsYield + ` (${zacksEarningsYieldIndustry})`,
    zacksDebtEquity: zacksDebtEquity + ` (${zacksDebtEquityIndustry})`,
    zacksCurrCashFlowGrowth: zacksCurrCashFlowGrowth + ` (${zacksCurrCashFlowGrowthIndustry})`,
    zacksHistCashFlowGrowth: zacksHistCashFlowGrowth + ` (${zacksHistCashFlowGrowthIndustry})`,
    zacksCurrentRatio: zacksCurrentRatio + ` (${zacksCurrentRatioIndustry})`,
    zacksDebtCapital: zacksDebtCapital + ` (${zacksDebtCapitalIndustry})`,
    zacksNetMargin: zacksNetMargin + ` (${zacksNetMarginIndustry})`,
    zacksROE: zacksROE + ` (${zacksROEIndustry})`,
    zacksSalesToAssets: zacksSalesToAssets + ` (${zacksSalesToAssetsIndustry})`,

    zacksGrowthEstimatePctYr: zacksGrowthEstimatePctYr + ` (${zacksGrowthEstimatePctYrInd})`,
    zacksGrowthEstimatePctNextYr:
      zacksGrowthEstimatePctNextYr + ` (${zacksGrowthEstimatePctNextYrInd})`,
    zacksGrowthEstimatePctFiveYr:
      zacksGrowthEstimatePctFiveYr + ` (${zacksGrowthEstimatePctFiveYrInd})`,

    zacksLastEarningsDate:
      zacksConfirmedNextEarningsDate && new Date(zacksConfirmedNextEarningsDate) < new Date()
        ? zacksConfirmedNextEarningsDate
        : zacksEpsSurprise,
    zacksNextEarningsDate: zacksConfirmedNextEarningsDate || zacksEstimatedNextEarningsDate,
  }
}

exports.fetch = ticker => handleFetch(fetchData, ticker, "Ford.fetch")
