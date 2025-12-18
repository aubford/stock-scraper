const { makePrettyDate, WarnError } = require("../util")
const JsDomFetcher = require("../fetchers/JsDomFetcher")
const { containsChars, textContainsPredicate } = require("./util/xpath")
const { fetchJson, handleFetch } = require("./util/www")
const { orderBy, sum } = require("lodash")
const { getDiffPercent } = require("../util")
const PageDataFetcher = require("../fetchers/PageDataFetcher")

const getEstimateSum = tableRowCellArr =>
  tableRowCellArr.slice(0, 4).reduce((acc, curr) => {
    return acc + Number(curr)
  }, 0)

const getMainData = async ticker => {
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
          } = {},
        } = {},
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
  } catch (err) {
    throw new WarnError("Failed to fetch mainData", "getMainData", err)
  }
}

const getSection = async (logger, name, cb) => {
  try {
    return await cb()
  } catch (err) {
    logger.warnError(new WarnError(`Failed to get section: ${name}`, "getSection", err))
  }
}

/**
 * @param {Logger} logger
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<Object>}
 */
const fetchData = async (logger, ticker, browser) => {
  const {
    zacksEpsTTM,
    dividend,
    zacksPriceLastClose,
    dividend_freq,
    confirmed_reporting_date,
    expected_reporting_date,
  } = await getMainData(ticker)

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

  const pageFetcher = new PageDataFetcher(ticker, browser, logger)

  // Helper function to replace JSDOM getTextArrByX with Puppeteer
  const getTextArrByX = async (xpath) => {
    const result = await pageFetcher.page.getTextByX(xpath)
    return Array.isArray(result) ? result : result ? [result] : []
  }

  // DETAILED EARNINGS ESTIMATES ///////////

  await pageFetcher.setPage(
    `https://www.zacks.com/stock/quote/${ticker}/detailed-earning-estimates`,
    { waitUntil: "networkidle2" }
  )

  // Wait for the table to be rendered by JavaScript
  await pageFetcher.waitForXpath(`//td[text()='Up Last 7 Days']`).catch(err => {
    logger.warnError(err)
  })

  // detailed estimates

  const {
    zacksEpsEstimateCurrentYr,
    zacksEpsEstimateNextYr,
    zacksAvgAnalystRatingOutOfFive,
    zacksEarningsESP,
  } = await getSection(logger, "detailed estimates", async () => {
    const detailXpath = (text) =>
      `//section[@id="detail_estimate"]/table//${textContainsPredicate("td", text)}/following-sibling::*/span`

    return {
      zacksEpsEstimateCurrentYr: await pageFetcher.page.getTextByX(detailXpath("Current Year")),
      zacksEpsEstimateNextYr: await pageFetcher.page.getTextByX(detailXpath("Next Year")),
      zacksAvgAnalystRatingOutOfFive: await pageFetcher.page.getTextByX(
        `//section[@id="detail_estimate"]/table//${textContainsPredicate("a", "ABR")}/../following-sibling::*/span`
      ),
      zacksEarningsESP: await pageFetcher.page.getTextByX(
        `//section[@id="detail_estimate"]/table//td/a[@class='newwin' and text()='Earnings ESP']/../following-sibling::*`
      ),
    }
  }) || {}

  // revisions

  const tableRowXpath = title => `//td[text()='${title}']/following-sibling::td`

  const weekRevisionsUp = sum(
    (await getTextArrByX(tableRowXpath("Up Last 7 Days"))).map(Number)
  )
  const weekRevisionsDown = sum(
    (await getTextArrByX(tableRowXpath("Down Last 7 Days"))).map(Number)
  )
  const monthRevisionsUp = sum(
    (await getTextArrByX(tableRowXpath("Up Last 30 Days"))).map(Number)
  )
  const monthRevisionsDown = sum(
    (await getTextArrByX(tableRowXpath("Down Last 30 Days"))).map(Number)
  )

  const zacksCurrentEpsEstimateSum = getEstimateSum(
    await getTextArrByX(tableRowXpath("Current"))
  )
  const zacksWeekEpsEstimateSum = getEstimateSum(
    await getTextArrByX(tableRowXpath("7 Days Ago"))
  )
  const zacksMonthEpsEstimateSum = getEstimateSum(
    await getTextArrByX(tableRowXpath("30 Days Ago"))
  )
  const zacksBiMonthEpsEstimateSum = getEstimateSum(
    await getTextArrByX(tableRowXpath("60 Days Ago"))
  )

  // growth estimates

  const [zacksGrowthEstimatePctYr, zacksGrowthEstimatePctYrInd] = await getTextArrByX(
    `//td[${containsChars("Current Year (")}]/following-sibling::td`
  )
  const [zacksGrowthEstimatePctNextYr, zacksGrowthEstimatePctNextYrInd] =
    await getTextArrByX(`//td[${containsChars("Next Year (")}]/following-sibling::td`)
  const [zacksGrowthEstimatePctFiveYr, zacksGrowthEstimatePctFiveYrInd] =
    await getTextArrByX(`//td[${containsChars("Next 5 Years")}]/following-sibling::td`)

  // Year over Year Growth Est.

  const {
    zacksYoYGrowthEstCurrentYearSales,
    zacksYoYGrowthEstNextYearSales,
    zacksYoYGrowthEstCurrentYearEps,
    zacksYoYGrowthEstNextYearEps,
  } = await getSection(logger, "YoY Growth Estimates", async () => {
    const [, , , currentYearSales, nextYearSales, , , , currentYearEps, nextYearEps] =
      await getTextArrByX(`//tr[td[${containsChars("Year over Year Growth Est.")}]]/td`)

    return {
      zacksYoYGrowthEstCurrentYearSales: parseFloat(currentYearSales.replace("%", "")) / 100,
      zacksYoYGrowthEstNextYearSales: parseFloat(nextYearSales.replace("%", "")) / 100,
      zacksYoYGrowthEstCurrentYearEps: parseFloat(currentYearEps.replace("%", "")) / 100,
      zacksYoYGrowthEstNextYearEps: parseFloat(nextYearEps.replace("%", "")) / 100,
    }
  }) || {}

  // STYLE SCORES ///////////////////////////

  const styleInterceptor = pageFetcher.addResponseInterceptor(
    [`https://www.zacks.com/stock/research/${ticker}/stock-style-scores`],
    false,
    { expectString: true }
  )
  await pageFetcher.setPage(
    `https://www.zacks.com/stock/research/${ticker}/stock-style-scores`,
    { waitUntil: "networkidle2" }
  )

  const styleHtml = await styleInterceptor.waitForResult().catch(err => {
    logger.warnError(err)
    return null
  })

  const fetcher = new JsDomFetcher()
  fetcher.setHTMLtoDOM(styleHtml)

  const [zacksValue, zacksGrowth, zacksMomentum] = fetcher.getTextArrByX(`//thead//th[2]/span`)
  const [
    zacksRank,
    zacksVGM,
    zacksCashPrice,
    zacksEVEbitda,
    ,
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

  await pageFetcher.close()

  // RESULT /////////////////////////////////

  return {
    zacksUpdatedAt: makePrettyDate(),
    zacksLastDividendAnnu: dividend * dividend_freq,

    zacksCurrentEpsEstimateSum,
    zacksWeekEpsEstimateSum,
    zacksMonthEpsEstimateSum,
    zacksBiMonthEpsEstimateSum,
    zacksEstimateChangePctWeek: getDiffPercent(
      zacksCurrentEpsEstimateSum,
      zacksWeekEpsEstimateSum
    ),
    zacksEstimateChangePctMonth: getDiffPercent(
      zacksCurrentEpsEstimateSum,
      zacksMonthEpsEstimateSum
    ),
    zacksEstimateChangePctBiMonth: getDiffPercent(
      zacksCurrentEpsEstimateSum,
      zacksBiMonthEpsEstimateSum
    ),
    zacksEstimateSumCurrent: zacksCurrentEpsEstimateSum
      ? zacksCurrentEpsEstimateSum.toFixed(2)
      : "?",
    zacksEstimateSumWeekAgo: zacksWeekEpsEstimateSum
      ? zacksWeekEpsEstimateSum.toFixed(2)
      : "?",
    zacksEstimateSumMonthAgo: zacksMonthEpsEstimateSum
      ? zacksMonthEpsEstimateSum.toFixed(2)
      : "?",
    zacksEstimateSumTwoMonthAgo: zacksBiMonthEpsEstimateSum
      ? zacksBiMonthEpsEstimateSum.toFixed(2)
      : "?",
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
    zacksEpsSurprise: epsSurprises[0]?.[1],
    zacksEpsTTM,
    zacksEpsEstimateCurrentYr,
    zacksEpsEstimateNextYr,
    zacksPEIndustry,

    zacksPegTTMIndustry,

    zacksBookPerShare: zacksPriceLastClose / zacksPB,
    zacksPBIndustry,

    zacksCashFlowPerShare,
    zacksPCFIndustry,

    zacksSalesPerShare: zacksPriceLastClose / zacksPriceToSales,
    zacksPriceToSalesIndustry,

    zacksProjSalesGrowth,
    zacksProjSalesGrowthIndustry,
    zacksPSGIndustry: zacksPriceToSalesIndustry / (zacksProjSalesGrowthIndustry / 100),

    zacksCashPrice,
    zacksHistEpsGrowth, // 3-5 years
    zacksProjEpsGrowth,
    zacksEVEbitda,
    zacksEarningsYield,
    zacksDebtEquity,
    zacksCurrCashFlowGrowth,
    zacksHistCashFlowGrowth,
    zacksCurrentRatio,
    zacksDebtCapital,
    zacksNetMargin,
    zacksROE,
    zacksSalesToAssets,
    zacksHistEpsGrowthIndustry,
    zacksProjEpsGrowthIndustry,
    zacksEVEbitdaIndustry,
    zacksEarningsYieldIndustry,
    zacksDebtEquityIndustry,
    zacksCurrCashFlowGrowthIndustry,
    zacksHistCashFlowGrowthIndustry,
    zacksCurrentRatioIndustry,
    zacksDebtCapitalIndustry,
    zacksNetMarginIndustry,
    zacksROEIndustry,
    zacksSalesToAssetsIndustry,
    zacksYoYGrowthEstCurrentYearSales,
    zacksYoYGrowthEstNextYearSales,
    zacksYoYGrowthEstCurrentYearEps,
    zacksYoYGrowthEstNextYearEps,

    zacksGrowthEstimatePctYr,
    zacksGrowthEstimatePctYrInd,
    zacksGrowthEstimatePctNextYr,
    zacksGrowthEstimatePctNextYrInd,
    zacksGrowthEstimatePctFiveYr,
    zacksGrowthEstimatePctFiveYrInd,
    zacksLastEarningsDate:
      zacksConfirmedNextEarningsDate && new Date(zacksConfirmedNextEarningsDate) < new Date()
        ? zacksConfirmedNextEarningsDate
        : epsSurprises[0]?.[0],
    zacksNextEarningsDate: zacksConfirmedNextEarningsDate || zacksEstimatedNextEarningsDate,
  }
}

exports.fetch = (ticker, browser) =>
  handleFetch(logger => fetchData(logger, ticker, browser), ticker, "ZACKS")
