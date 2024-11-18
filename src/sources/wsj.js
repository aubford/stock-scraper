const Cheerio = require("cheerio")
const { makePrettyDate, pause, MessageError, ReError } = require("../util")
const vooData = require("../../vooData.json")
const stockData = require("../../stockData.json")
const shortDateCalendar = require("../../shortDateCalendar.json")
const PageDataFetcher = require("../fetchers/PageDataFetcher")
const { handleFetch } = require("./util/www")

/**
 * @param wsjChart
 * @param wsjData
 * @returns {Object}
 */
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
 * @param {string} ticker
 * @param {Browser} browser
 * @param {Logger} logger
 * @param {number} tries - just used for recursion
 * @returns {Promise<Object>}
 */
const fetchData = async (ticker, browser, logger, tries = 1) => {
  const url = `https://www.wsj.com/market-data/quotes/${ticker}`
  const researchUrl = url + "/research-ratings"
  const financialsUrl = url + "/financials"

  const fetcher = new PageDataFetcher(ticker, browser, logger, {
    timeout: WSJ_TIMEOUT,
  })

  const interceptor = fetcher.addResponseInterceptor([url, researchUrl, financialsUrl], true)

  let mainPage
  let researchPage
  let financialsPage
  try {
    await fetcher.setPage(url)
    mainPage = await interceptor.waitForResult()

    await fetcher.setPage(researchUrl)
    researchPage = await interceptor.waitForResult()

    await fetcher.setPage(financialsUrl)
    financialsPage = await interceptor.waitForResult()
  } catch (err) {
    if (tries < 2) {
      logger.error("RETRY WSJ!")
      await pause(2000 * tries)
      return await fetchData(ticker, browser, logger, tries + 1)
    }

    throw new ReError("Failed to fetch WSJ pages", err, "fetchData")
  }

  await fetcher.close()

  const analystRatingsDoc = Cheerio.load(researchPage)
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

  if (noChart && shouldHaveChart) {
    if (tries < 2) {
      logger.error("NO CHART! RETRY WSJ!")
      await pause(2000 * tries)
      return await fetchData(ticker, browser, logger, tries + 1)
    }

    throw new MessageError(
      "Should have chart & NO CHART found after multiple tries!",
      "fetchData"
    )
  }

  logger.completeOk("Done")

  return buildWsjData(retVal)
}

exports.fetch = (ticker, browser) =>
  handleFetch(logger => fetchData(ticker, browser, logger), ticker, "WSJ")
