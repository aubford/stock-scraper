const moment = require("moment")
const JsDomFetcher = require("../fetchers/JsDomFetcher")
const { handleFetch } = require("./util/www")
const { extractNumbers } = require("./util/str")
const { tail, range, sum } = require("lodash")
const { orderBy } = require("lodash/collection")

const MAX_CHART_QUARTERS = 20

const getMovementNumber = activity => {
  const movementNum = Number(extractNumbers(activity))
  return activity.includes("Reduce")
    ? movementNum * -1
    : activity === "Buy"
    ? 100
    : movementNum
}

// sellout(-2.25) -40 sell(-1.5) -8 trim(-1) -3 rebalance(-.5) 0 hold(.75) 3 buy(2) 20 bigbuy(3) 100
const getMovementValue = movement => {
  const bigBuyThreshold = 20,
    buyThreshold = 3,
    holdThreshold = 0,
    trimThreshold = -3,
    sellThreshold = -8,
    sellOutThreshold = -40,
    bigBuyVal = 3,
    buyVal = 2,
    holdVal = 0.75,
    rebalanceVal = -0.5,
    trimVal = -1,
    sellVal = -1.5,
    sellOutVal = -2.25

  if (movement === "") {
    return buyThreshold
  }

  const getNegativeVal = x =>
    x < sellOutThreshold
      ? sellOutVal
      : x < sellThreshold
      ? sellVal
      : x < trimThreshold
      ? trimVal
      : rebalanceVal
  const getPositiveVal = x =>
    x > bigBuyThreshold ? bigBuyVal : x > buyThreshold ? buyVal : holdVal

  return movement >= holdThreshold ? getPositiveVal(movement) : getNegativeVal(movement)
}

/**
 * The activity page lists exits as "Sell 100%", which scores like "Reduce 100%".
 * @param {string} activity
 * @returns {number}
 */
const getActivityValue = activity =>
  getMovementValue(getMovementNumber(activity.replace("Sell", "Reduce")))

/**
 * @param ticker
 * @param fetcher
 * @returns {Promise<{firm: *, activity, pctOfPortfolio: *, value: string}[]>}
 */
const getOwnership = async (ticker, fetcher) => {
  await fetcher.setPage(`https://dataroma.com/m/stock.php?sym=${ticker}`)
  const ownershipRows = await fetcher.$$x(`//table[@id='grid']/tbody/tr`)
  return ownershipRows.map(row => {
    const [, firm, pctOfPortfolio, activity, , valueString] = row.getTextArrByX(`td`)
    const value = valueString.replaceAll(",", "")
    return {
      firm,
      pctOfPortfolio,
      activity: activity?.trim() || "0",
      value: (value / 1000000).toFixed(2) + "M",
    }
  })
}

/**
 * @param ticker
 * @param fetcher
 * @returns {Promise<{firm: *, activity: string, pctOfPortfolio: string, value: string}[]>}
 */
const getSells = async (ticker, fetcher) => {
  await fetcher.setPage(`https://dataroma.com/m/activity.php?sym=${ticker}&typ=a`)
  const activityRows = await fetcher.$$x(`//table[@id='grid']/tbody/tr`)
  const nextQuarterIndex = tail(activityRows).findIndex(({ textContent }) => {
    return textContent.includes("Q") && textContent.replace(" ", "").length === 7
  })
  const thisQuarterActivity = activityRows.slice(1, nextQuarterIndex + 1)
  const sellRows = thisQuarterActivity.filter(row => row.textContent.includes("Sell"))
  const sellFirmNames = sellRows.map(sell => sell.textContent.split("\n")[2])
  return sellFirmNames.map(firm => ({
    firm,
    activity: "Reduce 100%",
    value: "0",
    pctOfPortfolio: "0",
  }))
}

/**
 * @param {string} label - e.g. "Q2 2026"
 * @returns {number} quarters since year 0, so consecutive quarters differ by 1
 */
const getQuarterIndex = label => {
  const [, quarter, year] = label.match(/Q(\d)\s+(\d{4})/)
  return Number(year) * 4 + Number(quarter) - 1
}

/**
 * @param {string} ticker
 * @param {number} page
 * @returns {Promise<JsDomFetcher>}
 */
const getActivityPage = async (ticker, page) => {
  const fetcher = new JsDomFetcher()
  await fetcher.setPage(
    `https://dataroma.com/m/activity.php?sym=${ticker}&typ=a&L=${page}&o=a`
  )
  return fetcher
}

/**
 * The full activity history keyed by quarter index. Page 1 links every page, so the rest
 * are fetched in parallel; quarters can span pages, so rows are parsed in page order.
 * @param {string} ticker
 * @returns {Promise<Map<number, {firm: string, activity: string}[]>>}
 */
const getQuarterlyActivity = async ticker => {
  const firstPage = await getActivityPage(ticker, 1)
  const pageLinks = Array.from(firstPage.document().querySelectorAll("#pages a"))
  const lastPage = Math.max(
    1,
    ...pageLinks.map(({ href }) => Number(href.match(/L=(\d+)/)?.[1] || 1))
  )
  const otherPages = await Promise.all(
    range(2, lastPage + 1).map(page => getActivityPage(ticker, page))
  )

  const activityByQuarter = new Map()
  let quarter
  ;[firstPage, ...otherPages].forEach(fetcher => {
    fetcher.$$x(`//table[@id='grid']/tbody/tr`).forEach(row => {
      if (row.element.classList.contains("q_chg")) {
        quarter = getQuarterIndex(row.textContent)
        if (!activityByQuarter.has(quarter)) {
          activityByQuarter.set(quarter, [])
        }
      } else if (quarter !== undefined) {
        const [, firm, activity] = row.getTextArrByX(`td`)
        activityByQuarter.get(quarter).push({ firm: firm.trim(), activity: activity.trim() })
      }
    })
  })
  return activityByQuarter
}

/**
 * Walks the whole history oldest to newest. A manager's position opens on any non-Sell
 * activity (an Add/Reduce with no earlier Buy predates the history) and closes on Sell.
 * Open positions with no activity in a quarter are holds, scored like the ownership
 * page's no-change holders and counted like them in dataromaCount.
 * @param {Map<number, {firm: string, activity: string}[]>} activityByQuarter
 * @returns {{dataromaRatingChart: number[], dataromaCountChart: number[]}}
 */
const getCharts = activityByQuarter => {
  const quarters = [...activityByQuarter.keys()]
  if (!quarters.length) {
    return { dataromaRatingChart: [], dataromaCountChart: [] }
  }
  const holdValue = getActivityValue("0")
  const openPositions = new Set()
  const ratings = []
  const counts = []
  range(Math.min(...quarters), Math.max(...quarters) + 1).forEach(q => {
    const actions = activityByQuarter.get(q) || []
    const activeFirms = new Set(actions.map(({ firm }) => firm))
    const holds = [...openPositions].filter(firm => !activeFirms.has(firm)).length
    actions.forEach(({ firm, activity }) =>
      activity.startsWith("Sell") ? openPositions.delete(firm) : openPositions.add(firm)
    )
    ratings.push(
      sum(actions.map(({ activity }) => getActivityValue(activity))) + holds * holdValue
    )
    counts.push(actions.length + holds)
  })
  return {
    dataromaRatingChart: ratings.slice(-MAX_CHART_QUARTERS),
    dataromaCountChart: counts.slice(-MAX_CHART_QUARTERS),
  }
}

/**
 * @param {*} rating
 * @returns {string}
 */
const formatRating = rating => String(Number(Number(rating).toFixed(2)))

/**
 * Stamped only when the rating changes; otherwise the stored value carries over.
 * @param {number} dataromaRating
 * @param {Object} [previousRecord]
 * @returns {string | undefined} e.g. "Oct 6, 2026: was 3.25 (5 actions)"
 */
const getPreviousDataromaRating = (dataromaRating, previousRecord) => {
  if (!previousRecord) {
    return undefined
  }
  const { dataromaRating: prevRating, dataromaCount, dataromaActions } = previousRecord
  if (formatRating(prevRating) === formatRating(dataromaRating)) {
    return previousRecord.previousDataromaRating
  }
  const prevCount =
    dataromaCount ??
    (dataromaActions || "").split("\n").filter(line => line.startsWith(" [")).length
  const actionsLabel = prevCount === 1 ? "action" : "actions"
  return `${moment().format("MMM D, YYYY")}: was ${formatRating(
    prevRating
  )} (${prevCount} ${actionsLabel})`
}

/**
 * @param {string} ticker
 * @param {Object[]} dataFiles - ticker-keyed data, most recent first (e.g. staging, committed)
 * @returns {Object | undefined} the most recent record that has a dataromaRating
 */
const findPreviousRecord = (ticker, dataFiles) =>
  dataFiles
    .map(data => data[ticker])
    .find(record => record && Number.isFinite(parseFloat(record.dataromaRating)))

/**
 * @param logger
 * @param ticker
 * @param {Object} [previousRecord]
 * @returns {Promise<{dataromaActions: string, dataromaRating: *, dataromaCount: number, dataromaRatingChart: number[], dataromaCountChart: number[], previousDataromaRating: (string|undefined)}>}
 */
const fetchData = async (logger, ticker, previousRecord) => {
  const fetcher = new JsDomFetcher()

  const ownershipData = await getOwnership(ticker, fetcher).catch(err => {
    if (err.code === 489) {
      return []
    }
    throw err
  })
  const sells = await getSells(ticker, fetcher).catch(err => {
    if (err.code === 489) {
      return []
    }
    throw err
  })
  const quarterlyActivity = await getQuarterlyActivity(ticker).catch(err => {
    if (err.code === 489) {
      return new Map()
    }
    throw err
  })

  const dataromaActions = orderBy(
    ownershipData,
    ({ activity }) => getMovementNumber(activity),
    "desc"
  )
    .concat(sells)
    .map(({ firm, pctOfPortfolio, activity, value }) => {
      return `${firm}\n [${activity}, ${pctOfPortfolio}] ${value}`
    })
    .join("\n")

  const dataromaRating = ownershipData.concat(sells).reduce((sum, { activity }) => {
    const movement = getMovementNumber(activity)
    const value = getMovementValue(movement)
    return sum + value
  }, 0)

  const dataromaCount = ownershipData.length + sells.length

  return {
    dataromaRating,
    dataromaActions,
    dataromaCount,
    ...getCharts(quarterlyActivity),
    previousDataromaRating: getPreviousDataromaRating(dataromaRating, previousRecord),
  }
}

/**
 * @param {string} ticker
 * @param {Object} [previousRecord] - the ticker's last stored record, see findPreviousRecord
 * @returns {Promise<Object>}
 */
exports.fetch = (ticker, previousRecord) =>
  handleFetch(
    (logger, ticker) => fetchData(logger, ticker, previousRecord),
    ticker,
    "Dataroma"
  )
exports.findPreviousRecord = findPreviousRecord
