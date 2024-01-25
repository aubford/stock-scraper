const Logger = require("../Logger")
const Cheerio = require("cheerio")
const { makePrettyDate, pause, MessageError, formatErrorObject } = require("../util")
const vooData = require("../../vooData.json")
const stockData = require("../../stockData.json")
const shortDateCalendar = require("../../shortDateCalendar.json")
const { min } = require("lodash")
const { JSDOM } = require("jsdom")
const PageDataFetcher = require("../fetchers/PageDataFetcher")

const buildWsjData = ({ wsjChart, ...wsjData }) => {
  const charts = wsjChart
    ? {
        wsjChartThreeMonthAgo: wsjChart
          .filter((d, idx) => idx % 3 === 0)
          .map(str => Number(str))
          .reverse(),
        wsjChartMonthAgo: wsjChart
          .filter((d, idx) => (idx + 2) % 3 === 0)
          .map(str => Number(str))
          .reverse(),
        wsjChartCurrent: wsjChart
          .filter((d, idx) => (idx + 1) % 3 === 0)
          .map(str => Number(str))
          .reverse(),
        wsjChartCurrentNum: wsjChart
          .filter((d, idx) => (idx + 1) % 3 === 0)
          .reduce((acc, curr) => acc + Number(curr), 0),
      }
    : {}
  return {
    ...charts,
    ...Object.fromEntries(Object.entries(wsjData).filter(([, value]) => value)), // remove entries w/ falsy values
  }
}

/**
 * @param ticker {string}
 * @param browser {Browser}
 * @param tries {number} - just used for recursion
 * @returns {Promise<{wsjChart,wsjShortPct,wsjShortChange}> | []}
 */
exports.fetch = async (ticker, browser, tries = 1) => {
  const logger = new Logger(ticker, "WSJ")
  const url = `https://www.wsj.com/market-data/quotes/${ticker}`
  const researchUrl = url + "/research-ratings"
  const financialsUrl = url + "/financials"

  const fetcher = new PageDataFetcher(ticker, browser, logger, {
    timeout: FIDELITY_ANALYST_TIMEOUT,
  })

  try {
    let essRes = []
    fetcher.addResponseInterceptor(
      [url, researchUrl, financialsUrl],
      res => {
        essRes.push(res)
      },
      true
    )

    await fetcher.setPage(url)
    await fetcher.setPage(researchUrl)
    await fetcher.setPage(financialsUrl)

    const [mainPage, researchPage, financialsPage] = essRes
    const analystRatingsDoc = Cheerio.load(/**@type * */ researchPage)
    const wsjChart = analystRatingsDoc(".cr_analystRatings .data_data")
      .contents()
      .get()
      .map(node => node.data)

    const [, wsjHighTarget, , wsjMedianTarget, , wsjLowTarget, , wsjAverageTarget] =
      analystRatingsDoc(".cr_data.rr_stockprice .data_data")
        .contents()
        .get()
        .map(node => node.data)

    const mainPageDoc = Cheerio.load(/**@type * */ mainPage)
    const financialsPageDoc = Cheerio.load(/**@type * */ financialsPage)

    const wsjShortDateRaw = mainPageDoc(`h3:contains("Short Interest ") span`).text()
    const wsjShortDate = wsjShortDateRaw
      ? wsjShortDateRaw.replace("(", "").replace(")", "")
      : wsjShortDateRaw

    const retVal = {
      wsjPriceTargets: `$${wsjLowTarget} - $${wsjAverageTarget} ($${wsjMedianTarget}) - $${wsjHighTarget}`,
      wsjHighTarget,
      wsjMedianTarget,
      wsjLowTarget,
      wsjAverageTarget,
      wsjUpdatedAt: makePrettyDate(),
      wsjChart,
      wsjShortPct: mainPageDoc(`h5:contains("Percent of Float")`).next().text(),
      wsjShortChange: mainPageDoc(`h5:contains("Change from Last")`).next().text(),
      wsjShortDate,
      wsjShortDatePrev: shortDateCalendar[shortDateCalendar.indexOf(wsjShortDate) - 1],
      wsjLastEarningsDate: financialsPageDoc(`span.data_lbl:contains("Last Report")`)
        .next()
        .text(),
      wsjNextEarningsDate: financialsPageDoc(`span.data_lbl:contains("Next Report")`)
        .next()
        .text(),
    }

    const noChart = !retVal.wsjChart || retVal.wsjChart.length === 0
    const shouldHaveChart =
      stockData[ticker]?.wsjChartCurrent?.length > 0 ||
      vooData[ticker]?.wsjChartCurrent?.length > 0

    if (noChart) {
      logger.error("NO CHART!")

      if (tries < 6) {
        if (shouldHaveChart || tries < 3) {
          logger.error("RETRY WSJ!")
          await pause(min([5000, 2000 * tries]))
          return exports.fetch(ticker, tries + 1)
        }
      }

      if (shouldHaveChart) {
        throw new MessageError("Should have chart & NO CHART found after multiple tries!")
      }
    }

    logger.completeOk("Done")

    return buildWsjData(retVal)
  } catch (error) {
    logger.logError(error)
    return formatErrorObject(error, ticker)
  }
}
