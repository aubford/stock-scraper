const moment = require("moment")
const JsDomFetcher = require("../fetchers/JsDomFetcher")
const { handleFetch } = require("./util/www")
const { extractNumbers } = require("./util/str")
const { range, sum } = require("lodash")
const { orderBy } = require("lodash/collection")

const MAX_CHART_QUARTERS = 20
// 13Fs are due 45 days after quarter end; holders with no filing by this point are dead.
const QUARTER_COMPLETE_DAYS = 60
const MAX_CONCURRENT_REQUESTS = 3

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
 * Exits are listed as "Sell 100%", which scores like "Reduce 100%".
 * @param {string} activity
 * @returns {number}
 */
const getActivityMovement = activity => getMovementNumber(activity.replace("Sell", "Reduce"))

/**
 * @param {string} activity
 * @returns {number}
 */
const getActivityValue = activity => getMovementValue(getActivityMovement(activity))

let activeRequests = 0
const waitingRequests = []

/**
 * Every Dataroma page load shares one cap, including across tickers fetched in parallel.
 * @param {string} url
 * @returns {Promise<JsDomFetcher>}
 */
const loadPage = async url => {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests++
  } else {
    await new Promise(resolve => waitingRequests.push(resolve))
  }
  try {
    const fetcher = new JsDomFetcher()
    await fetcher.setPage(url)
    return fetcher
  } finally {
    const next = waitingRequests.shift()
    next ? next() : activeRequests--
  }
}

/**
 * @param {Object} row - grid row with a link to the manager's holding/activity history
 * @param {string} firm
 * @returns {string} e.g. "pcm" from hist.php?f=pcm&s=LLY, or the firm name if unlinked
 */
const getManagerCode = (row, firm) => {
  const href = row.element.querySelector("a[href*='hist.php']")?.getAttribute("href") || ""
  return href.match(/[?&]f=([^&]+)/)?.[1] || firm
}

/**
 * @param {string} label - "Q2 2026" on activity pages, "2026 Q2" on history pages
 * @returns {number} quarters since year 0, so consecutive quarters differ by 1
 */
const getQuarterIndex = label => {
  const [, quarter, year] = label.match(/Q(\d)\s+(\d{4})/) || []
  const [, histYear, histQuarter] = label.match(/(\d{4})\s+Q(\d)/) || []
  return Number(year || histYear) * 4 + Number(quarter || histQuarter) - 1
}

/**
 * @param {number} quarter - see getQuarterIndex
 * @returns {string} e.g. "Q3 2026"
 */
const formatQuarterLabel = quarter =>
  `Q${(quarter % 4) + 1} ${Math.floor(quarter / 4)}`

/**
 * @param {number} quarter - see getQuarterIndex
 * @returns {boolean}
 */
const isQuarterComplete = quarter => {
  const quarterEnd = moment
    .utc([Math.floor(quarter / 4), (quarter % 4) * 3 + 2])
    .endOf("month")
  return moment.utc().isSameOrAfter(quarterEnd.add(QUARTER_COMPLETE_DAYS, "days"))
}

/**
 * @param ticker
 * @returns {Promise<{firm: string, code: string, activity: string, pctOfPortfolio: string, value: string}[]>}
 */
const getOwnership = async ticker => {
  const fetcher = await loadPage(`https://dataroma.com/m/stock.php?sym=${ticker}`)
  const ownershipRows = fetcher.$$x(`//table[@id='grid']/tbody/tr`)
  return ownershipRows.map(row => {
    const [, firm, pctOfPortfolio, activity, , valueString] = row.getTextArrByX(`td`)
    const value = valueString.replaceAll(",", "")
    return {
      firm: firm.trim(),
      code: getManagerCode(row, firm.trim()),
      pctOfPortfolio,
      activity: activity?.trim() || "0",
      value: (value / 1000000).toFixed(2) + "M",
    }
  })
}

/**
 * @param {string} ticker
 * @param {number} page
 * @returns {Promise<JsDomFetcher>}
 */
const getActivityPage = (ticker, page) =>
  loadPage(`https://dataroma.com/m/activity.php?sym=${ticker}&typ=a&L=${page}&o=a`)

/**
 * The full activity history. Page 1 links every page, so the rest are fetched in
 * parallel; quarters can span pages, so rows are parsed in page order.
 * @param {string} ticker
 * @returns {Promise<{quarter: number, firm: string, code: string, activity: string}[]>}
 */
const getActivityRows = async ticker => {
  const firstPage = await getActivityPage(ticker, 1)
  const pageLinks = Array.from(firstPage.document().querySelectorAll("#pages a"))
  const lastPage = Math.max(
    1,
    ...pageLinks.map(({ href }) => Number(href.match(/L=(\d+)/)?.[1] || 1))
  )
  const otherPages = await Promise.all(
    range(2, lastPage + 1).map(page => getActivityPage(ticker, page))
  )

  const activityRows = []
  let quarter
  ;[firstPage, ...otherPages].forEach(fetcher => {
    fetcher.$$x(`//table[@id='grid']/tbody/tr`).forEach(row => {
      if (row.element.classList.contains("q_chg")) {
        quarter = getQuarterIndex(row.textContent)
      } else if (quarter !== undefined) {
        const [, firm, activity] = row.getTextArrByX(`td`)
        activityRows.push({
          quarter,
          firm: firm.trim(),
          code: getManagerCode(row, firm.trim()),
          activity: activity.trim(),
        })
      }
    })
  })
  return activityRows
}

/**
 * One row per quarter the manager reported the stock, including no-change holds, so a
 * missing quarter means no filing.
 * @param {string} ticker
 * @param {string} code - see getManagerCode
 * @returns {Promise<Map<number, string> | undefined>} activity by quarter, "0" for holds
 */
const getHolderHistory = async (ticker, code) => {
  const fetcher = await loadPage(`https://dataroma.com/m/hist/hist.php?f=${code}&s=${ticker}`)
  const rows = fetcher.$$x(`//table[@id='grid']/tbody/tr`)
  return new Map(
    rows.map(row => {
      const [period, , , activity] = row.getTextArrByX(`td`)
      return [getQuarterIndex(period), activity?.trim() || "0"]
    })
  )
}

/**
 * @typedef {{firm: string, rows: Map<number, string>, hasFilingHistory: boolean, isHolder: boolean}} ManagerTimeline
 */

/**
 * Current holders use their history pages; everyone else comes from the activity pages.
 * @param {{firm: string, code: string}[]} ownershipData
 * @param {{quarter: number, firm: string, code: string, activity: string}[]} activityRows
 * @param {Map<string, Map<number, string> | undefined>} holderHistories
 * @returns {Map<string, ManagerTimeline>}
 */
const getManagerTimelines = (ownershipData, activityRows, holderHistories) => {
  const timelines = new Map()
  activityRows.forEach(({ quarter, firm, code, activity }) => {
    if (!timelines.has(code)) {
      timelines.set(code, { firm, rows: new Map(), hasFilingHistory: false, isHolder: false })
    }
    const { rows } = timelines.get(code)
    if (!rows.has(quarter)) {
      rows.set(quarter, activity)
    }
  })
  ownershipData.forEach(({ firm, code }) => {
    const history = holderHistories.get(code)
    timelines.set(code, {
      firm,
      rows: history?.size ? history : timelines.get(code)?.rows || new Map(),
      hasFilingHistory: Boolean(history?.size),
      isHolder: true,
    })
  })
  return timelines
}

/**
 * Walks each manager's history oldest to newest. A position opens on any non-Sell
 * activity (an Add/Reduce with no earlier Buy predates the history) and closes on Sell.
 *
 * - Holders with a filing history: a missing quarter means no filing. In a complete quarter
 *   they are dead (left out) until they file again; in an incomplete one they keep their
 *   previous quarter's activity until they file.
 * - Everyone else: quarters between activity rows are holds. Last quarter's sellouts carry
 *   into an incomplete quarter. Former holders with no sellout row are dropped after their
 *   last activity.
 * @param {Map<string, ManagerTimeline>} timelines
 * @returns {{quarter: number, code: string, firm: string, activity: string}[][]} entries per quarter
 */
const getQuarterEntries = timelines => {
  const quarters = [...timelines.values()].flatMap(({ rows }) => [...rows.keys()])
  if (!quarters.length) {
    return []
  }
  const allQuarters = range(Math.min(...quarters), Math.max(...quarters) + 1)
  const entriesByQuarter = allQuarters.map(() => [])

  timelines.forEach(({ firm, rows, hasFilingHistory, isHolder }, code) => {
    const lastQuarter = Math.max(...rows.keys())
    const vanished = !isHolder && !rows.get(lastQuarter).startsWith("Sell")
    let open = false
    let previousActivity

    allQuarters.forEach((quarter, i) => {
      let activity = rows.get(quarter)
      if (activity !== undefined) {
        open = !activity.startsWith("Sell")
      } else if (
        previousActivity !== undefined &&
        !isQuarterComplete(quarter) &&
        (hasFilingHistory || previousActivity.startsWith("Sell"))
      ) {
        activity = previousActivity
      } else if (open && !hasFilingHistory && !(vanished && quarter > lastQuarter)) {
        activity = "0"
      }
      previousActivity = activity
      if (activity !== undefined) {
        entriesByQuarter[i].push({ quarter, code, firm, activity })
      }
    })
  })
  return entriesByQuarter
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
 * @param {Promise<T>} promise
 * @param {T} fallback - used when the page has no grid rows (ticker or manager not listed)
 * @returns {Promise<T>}
 * @template T
 */
const orIfMissing = (promise, fallback) =>
  promise.catch(err => {
    if (err.code === 489) {
      return fallback
    }
    throw err
  })

/**
 * The current rating is the newest chart quarter.
 * @param logger
 * @param ticker
 * @param {Object} [previousRecord]
 * @returns {Promise<{dataromaActions: string, dataromaRating: number, dataromaCount: number, dataromaRatingChart: number[], dataromaCountChart: number[], dataromaChartQuarter: (string|undefined), previousDataromaRating: (string|undefined)}>}
 */
const fetchData = async (logger, ticker, previousRecord) => {
  const [ownershipData, activityRows] = await Promise.all([
    orIfMissing(getOwnership(ticker), []),
    orIfMissing(getActivityRows(ticker), []),
  ])
  const holderHistories = new Map(
    await Promise.all(
      ownershipData.map(async ({ code }) => [
        code,
        await orIfMissing(getHolderHistory(ticker, code), undefined),
      ])
    )
  )

  const timelines = getManagerTimelines(ownershipData, activityRows, holderHistories)
  const entriesByQuarter = getQuarterEntries(timelines)
  const ratings = entriesByQuarter.map(entries =>
    sum(entries.map(({ activity }) => getActivityValue(activity)))
  )
  const counts = entriesByQuarter.map(entries => entries.length)

  const ownershipByCode = new Map(ownershipData.map(holder => [holder.code, holder]))
  const dataromaActions = orderBy(
    entriesByQuarter[entriesByQuarter.length - 1] || [],
    ({ activity }) => getActivityMovement(activity),
    "desc"
  )
    .map(({ code, firm, activity }) => {
      const { pctOfPortfolio = "0", value = "0" } = ownershipByCode.get(code) || {}
      return `${firm}\n [${activity}, ${pctOfPortfolio}] ${value}`
    })
    .join("\n")

  const dataromaRating = ratings[ratings.length - 1] ?? 0
  const lastQuarter = Math.max(
    ...[...timelines.values()].flatMap(({ rows }) => [...rows.keys()]),
    Number.NEGATIVE_INFINITY
  )

  return {
    dataromaRating,
    dataromaActions,
    dataromaCount: counts[counts.length - 1] ?? 0,
    dataromaRatingChart: ratings.slice(-MAX_CHART_QUARTERS),
    dataromaCountChart: counts.slice(-MAX_CHART_QUARTERS),
    dataromaChartQuarter: Number.isFinite(lastQuarter)
      ? formatQuarterLabel(lastQuarter)
      : undefined,
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
