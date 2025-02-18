const { makePrettyDate, WarnError } = require("../util")
const JsDomFetcher = require("../fetchers/JsDomFetcher")
const { containsChars, textContainsPredicate } = require("./util/xpath")
const { fetchJson, handleFetch } = require("./util/www")
const { orderBy, sum } = require("lodash")
const { getDiffPercent } = require("../util")

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

const getSection = (logger, name, cb) => {
  try {
    return cb()
  } catch (err) {
    logger.warnError(new WarnError(`Failed to get section: ${name}`, "getSection", err))
  }
}

/**
 * @param {Logger} logger
 * @param {string} ticker
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

  const fetcher = new JsDomFetcher()

  // DETAILED EARNINGS ESTIMATES ///////////

  const fetchOptions = {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36",
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      priority: "u=0, i",
      "sec-ch-ua": '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      cookie:
        "overlay_popup_22=1; nlbi_2944342=dUJyEnvHxl8ifadGUJ37GgAAAAAjKBIGuOCYI52dmRkpW69X; visid_incap_2944342=p/MkikhTQpGE6yToiDf0x6E5PmcAAAAAQUIPAAAAAABagYm05u2UQfp7tp+pTeSQ; visid_incap_2934056=/8223OaUSHGD66loOf1sD6I5PmcAAAAAQUIPAAAAAAA1574i194ylKQ2f0aWrs0n; AMCVS_3064401053DB594D0A490D4C%40AdobeOrg=1; disclosure_flag=Y; visid_incap_2879622=os6JduGjQhaaTKm7zlvaeSjKj2cAAAAAQUIPAAAAAADl21eRsN9SOEq2yD5xy4Nt; user_session=8531522868edd108a0b5889ebcccb34a; recentQuotes=MS%2CMDT%2CAAPL; incap_ses_172_2879622=MB9lG1eLwG07tzAjWBFjAjOqtGcAAAAAPmxQhhcCxMkLQ30Hkt1zbw==; incap_ses_172_2934056=r6CFTw45Ri5xuHwjWBFjAsq5tGcAAAAANfuZWNyOVZynef7dKr03MQ==; AMCV_3064401053DB594D0A490D4C%40AdobeOrg=77933605%7CMCIDTS%7C20138%7CMCMID%7C30889052653821893719091468314326963359%7CMCAID%7CNONE%7CMCOPTOUT-1739904499s%7CNONE%7CvVersion%7C4.5.1; incap_ses_172_2944342=Uzq5ObMD4QNY+60jWBFjAqvDtGcAAAAAn2iiydpNJ77sGg/CvoPbrQ==; nlbi_2944342_2147483392=T84NbxZf/jmlQYviUJ37GgAAAABQhAEoUS4x7qq2Gn5zyaQx; reese84=3:2cYv0mi1trFOl89UlO6VRQ==:58/VkJBNzQ9nHgvhFMHrAl2P2z+S7eZUgcozUIAwcf87rc7PR7wfuvaPU/Ls/rtiJ7QeWxWHy9KUEVWJ5752EOHwc2t5w5fGiTiMDdA3INZpVM/f/CPYOv0ZOl+MtoEfdXq6SxSPquzDOlFR6t3dXxCo7oGbF+SbSLJyBc8XD4o42bA510zfoQhIv0hyzFiouPuRmiBbUODw7bB4nV+lXkmwomC++3FiwzYJInfJMEcvXmw0qHkPmlmUPfhdnkIxOCUPb6PW3GzROHAM23UJkvRadL/tksV7++NF6xIbg1Qa7hZi42dfjUhwzljaDhk5lylsC2N3uQxxWxo53OJeYWzB37J5gOuu5nDO0V7zgboRx4aAhHa4Gt0JtCa2iIGJreAOYtJojlL8cYxFZ89BFC4j2hhbwXE610wM4pUfPBHmf/yXlIBmmu2Q5DCPxaQBpNPI5JWDKvHvkOAcwMDxy4q2F2uHAQ8McNU3LkS0RHc=:2eKH4vXS1+hQtzpI1YEvzrqYTN0HhOfw849j+F6j6f4=",
      Referer: "https://www.zacks.com/stock/quote/AAPL/detailed-earning-estimates",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  }

  await fetcher.setPageViaFetch(
    `https://www.zacks.com/stock/quote/${ticker}/detailed-earning-estimates`,
    { fetchOptions }
  )

  // detailed estimates

  const {
    zacksEpsEstimateCurrentYr,
    zacksEpsEstimateNextYr,
    zacksAvgAnalystRatingOutOfFive,
    zacksEarningsESP,
  } = getSection(logger, "detailed estimates", () => {
    const detailSection = fetcher.$x(`//section[@id="detail_estimate"]/table`)
    const detailXpath = text =>
      detailSection.getTextByX(
        `//${textContainsPredicate("td", text)}/following-sibling::*/span`
      )

    return {
      zacksEpsEstimateCurrentYr: detailXpath("Current Year"),
      zacksEpsEstimateNextYr: detailXpath("Next Year"),
      zacksAvgAnalystRatingOutOfFive: detailSection.getTextByX(
        `//${textContainsPredicate("a", "ABR")}/../following-sibling::*/span`
      ),
      zacksEarningsESP: detailSection.getTextByX(
        `//td/a[@class='newwin' and text()='Earnings ESP']/../following-sibling::*`
      ),
    }
  })

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

  // Year over Year Growth Est.

  const {
    zacksYoYGrowthEstCurrentYearSales,
    zacksYoYGrowthEstNextYearSales,
    zacksYoYGrowthEstCurrentYearEps,
    zacksYoYGrowthEstNextYearEps,
  } = getSection(logger, "YoY Growth Estimates", () => {
    const [, , , currentYearSales, nextYearSales, , , , currentYearEps, nextYearEps] =
      fetcher.getTextArrByX(`//tr[td[${containsChars("Year over Year Growth Est.")}]]/td`)

    return {
      zacksYoYGrowthEstCurrentYearSales: parseFloat(currentYearSales.replace("%", "")) / 100,
      zacksYoYGrowthEstNextYearSales: parseFloat(nextYearSales.replace("%", "")) / 100,
      zacksYoYGrowthEstCurrentYearEps: parseFloat(currentYearEps.replace("%", "")) / 100,
      zacksYoYGrowthEstNextYearEps: parseFloat(nextYearEps.replace("%", "")) / 100,
    }
  })

  // STYLE SCORES ///////////////////////////

  await fetcher.setPageViaFetch(
    `https://www.zacks.com/stock/research/${ticker}/stock-style-scores`,
    { fetchOptions }
  )

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

exports.fetch = ticker => handleFetch(fetchData, ticker, "ZACKS")
