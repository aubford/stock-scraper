const Cheerio = require("cheerio")
const moment = require("moment")
const { get, merge } = require("lodash")
const { makePrettyDate, pause, MessageError, ReError } = require("../util")
const vooData = require("../../vooData.json")
const stockData = require("../../stockData.json")
const shortDateCalendar = require("../../shortDateCalendar.json")
const PageDataFetcher = require("../fetchers/PageDataFetcher")
const { handleFetch } = require("./util/www")

const APOLLO_PUSH_REGEX =
  /^\(window\[Symbol\.for\("ApolloSSRDataTransport"\)\] \?\?= \[\]\)\.push\(([\s\S]*)\);?$/
const RATING_KEYS = ["buy", "overweight", "hold", "underweight", "sell"]
const RATING_PERIODS = ["P3M_AGO", "P1M_AGO", "CURRENT"]

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
 * Merges every `MDMarketData` query result that the page server-renders into Apollo's
 * rehydration scripts.
 * @param {string} html
 * @returns {Object}
 */
const getMarketData = html => {
  const $ = Cheerio.load(html)
  const marketDataEntries = $("script")
    .get()
    .map(el => $(el).text().trim().match(APOLLO_PUSH_REGEX)?.[1])
    .filter(Boolean)
    .flatMap(json => Object.values(JSON.parse(json).rehydrate || {}))
    .map(entry => entry?.data)
    .filter(data => data?.__typename === "MDMarketData")
  return merge({}, ...marketDataEntries)
}

/**
 * Flattened like the old ratings table: rows buy → sell, each row 3 months ago → current.
 * @param {Array<Object>} analystRatingsDetail
 * @returns {string[]}
 */
const buildWsjChart = analystRatingsDetail => {
  const byPeriod = Object.fromEntries(analystRatingsDetail.map(r => [r.offsetPeriod, r]))
  if (!RATING_PERIODS.every(period => byPeriod[period])) {
    return []
  }
  return RATING_KEYS.flatMap(key =>
    RATING_PERIODS.map(period => String(get(byPeriod[period], [key, "value"], 0)))
  )
}

/**
 * @param {string | undefined} str
 * @param {string} inFormat
 * @param {string} outFormat
 * @returns {string | undefined}
 */
const reformatDate = (str, inFormat, outFormat) => {
  if (!str) return undefined
  const date = moment(str, inFormat, true)
  return date.isValid() ? date.format(outFormat) : undefined
}

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @param {Logger} logger
 * @param {number} tries - just used for recursion
 * @returns {Promise<Object>}
 */
const fetchData = async (ticker, browser, logger, tries = 1) => {
  const url = `https://www.wsj.com/market-data/stock/${ticker.toLowerCase()}`

  const fetcher = new PageDataFetcher(ticker, browser, logger, {
    timeout: WSJ_TIMEOUT,
  })

  const interceptor = fetcher.addResponseInterceptor([url], true)

  let mainPage
  try {
    await fetcher.setPage(url)
    mainPage = await interceptor.waitForResult()
  } catch (err) {
    await fetcher.close()
    if (tries < 2) {
      logger.error("RETRY WSJ!")
      await pause(2000 * tries)
      return await fetchData(ticker, browser, logger, tries + 1)
    }

    throw new ReError("Failed to fetch WSJ page", err, "fetchData")
  }

  await fetcher.close()

  const marketData = getMarketData(/**@type * */ mainPage)

  const ratings = get(marketData, "ratings.analystRatingsDetail", [])
  const currentRatings = ratings.find(r => r.offsetPeriod === "CURRENT")
  const target = key => get(currentRatings, [key, "formattedValue"])
  const wsjHighTarget = target("targetHighPrice")
  const wsjMedianTarget = target("targetMedianPrice")
  const wsjLowTarget = target("targetLowPrice")
  const wsjAverageTarget = target("targetMeanPrice")

  const shortInterest = get(marketData, "pricingStatistics.endOfDayStatistics.shortInterest")
  const shortVolume = get(shortInterest, "volume.value")
  const floatMillions = get(marketData, "fundamentals.floatSharesInMillions.value")
  // WSJ reports percentOfFloat as "N/A" for some tickers (e.g. BAC), so derive it like they do
  const shortPct =
    shortVolume && floatMillions
      ? ((shortVolume / (floatMillions * 1e6)) * 100).toFixed(2)
      : get(shortInterest, "percentOfFloat.value") || undefined
  const wsjShortDate = reformatDate(
    get(shortInterest, "shortInterestDate.formattedValue"),
    "MMM D, YYYY",
    "MM/DD/YY"
  )

  const retVal = {
    wsjPriceTargets: currentRatings
      ? `$${wsjLowTarget} - $${wsjAverageTarget} ($${wsjMedianTarget}) - $${wsjHighTarget}`
      : undefined,
    wsjHighTarget,
    wsjMedianTarget,
    wsjLowTarget,
    wsjAverageTarget,
    wsjUpdatedAt: makePrettyDate(),
    wsjChart: buildWsjChart(ratings),
    wsjShortPct: shortPct ? `${shortPct}%` : undefined,
    wsjShortDate,
    wsjShortDatePrev: wsjShortDate
      ? shortDateCalendar[shortDateCalendar.indexOf(wsjShortDate) - 1]
      : undefined,
    wsjNextEarningsDate: reformatDate(
      get(marketData, "financials.epsDueDate.value"),
      "YYYY-MM-DD",
      "MM/DD/YYYY"
    ),
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
