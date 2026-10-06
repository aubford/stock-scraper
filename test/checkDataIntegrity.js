// Data integrity checks for scraped stock records.
//   npm run check-integrity                 staging + committed
//   npm run check-integrity -- staging      only stockDataStaging.json
//   npm run check-integrity -- committed    only stockData.json
const moment = require("moment")
const path = require("path")
const { sum } = require("lodash")

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_FAILURES_SHOWN = 8

/**
 * A check returns undefined to skip (field not present), true to pass, or false / a
 * detail string to fail.
 * @typedef {{ name: string, test: (record: Object, key: string) => (boolean | string | undefined) }} IntegrityCheck
 */

/**
 * @param {*} value
 * @returns {boolean}
 */
const isBlank = value => value === undefined || value === null || value === ""

/**
 * @param {*} value - e.g. "1,070.10", "0.88%", 1.08
 * @returns {number}
 */
const toNumber = value =>
  typeof value === "number" ? value : parseFloat(String(value).replaceAll(",", ""))

/**
 * @param {string} dateStr - "10/5/2026" or "07/30/26"
 * @returns {moment.Moment}
 */
const parseDate = dateStr => moment(dateStr, ["M/D/YYYY", "MM/DD/YY"], true)

/**
 * @param {Object} record
 * @returns {number | undefined}
 */
const getLastPrice = record =>
  [record.yahooDailyPrices?.[0], record.zacksPriceLastClose]
    .map(toNumber)
    .find(price => price > 0)

/**
 * @param {Object} record
 * @param {string[]} keys
 * @returns {string | true | undefined} names of present arrays that differ in length
 */
const checkAligned = (record, keys) => {
  const arrays = keys.filter(key => Array.isArray(record[key]))
  if (arrays.length < 2) {
    return undefined
  }
  const lengths = arrays.map(key => record[key].length)
  return new Set(lengths).size === 1 || arrays.map((k, i) => `${k}=${lengths[i]}`).join(" ")
}

/** @type {IntegrityCheck[]} */
const CHECKS = [
  {
    name: "ticker-identity",
    test: (record, key) =>
      (record.ticker === key &&
        (isBlank(record.tickerSearch) || record.tickerSearch === `//${key}`)) ||
      `key=${key} ticker=${record.ticker}`,
  },
  {
    name: "no-ticker-error",
    test: record => isBlank(record.error) || String(record.error).slice(0, 80),
  },
  {
    name: "no-source-errors",
    test: record => {
      const errorKeys = Object.keys(record).filter(key => key.startsWith("error_"))
      return !errorKeys.length || errorKeys.join(",")
    },
  },
  {
    name: "scrape-recent",
    test: record => {
      if (isBlank(record.scrapeDataUpdatedAt)) {
        return undefined
      }
      const ageDays = (Date.now() - new Date(record.scrapeDataUpdatedAt).getTime()) / DAY_MS
      return (ageDays > -1 && ageDays <= 7) || `${ageDays.toFixed(1)} days old`
    },
  },
  {
    name: "yahoo-prices-dates-aligned",
    test: record => {
      const { yahooDailyPrices: prices, yahooDailyPricesDates: dates } = record
      if (!Array.isArray(prices) && !Array.isArray(dates)) {
        return undefined
      }
      return (
        (prices?.length === dates?.length && prices.length >= 200) ||
        `prices=${prices?.length} dates=${dates?.length}`
      )
    },
  },
  {
    name: "yahoo-prices-positive",
    test: record => {
      if (!Array.isArray(record.yahooDailyPrices)) {
        return undefined
      }
      const badIndex = record.yahooDailyPrices.findIndex(price => !(toNumber(price) > 0))
      return (
        badIndex === -1 || `[${badIndex}]=${JSON.stringify(record.yahooDailyPrices[badIndex])}`
      )
    },
  },
  {
    name: "yahoo-dates-descending-fresh",
    test: record => {
      const dates = record.yahooDailyPricesDates
      if (!Array.isArray(dates) || !dates.length) {
        return undefined
      }
      const parsed = dates.map(parseDate)
      const badIndex = parsed.findIndex(
        (date, i) => !date.isValid() || (i > 0 && !date.isBefore(parsed[i - 1]))
      )
      if (badIndex !== -1) {
        return `out of order at [${badIndex}] ${dates[badIndex]}`
      }
      const scrapedAt = moment(record.scrapeDataUpdatedAt || undefined)
      const staleDays = scrapedAt.diff(parsed[0], "days", true)
      return (
        staleDays <= 5 || `newest ${dates[0]} is ${staleDays.toFixed(1)} days before scrape`
      )
    },
  },
  {
    name: "last-close-agrees",
    test: record => {
      const yahoo = toNumber(record.yahooDailyPrices?.[0])
      const zacks = toNumber(record.zacksPriceLastClose)
      if (!(yahoo > 0) || !(zacks > 0)) {
        return undefined
      }
      return Math.abs(zacks / yahoo - 1) <= 0.1 || `yahoo=${yahoo} zacks=${zacks}`
    },
  },
  {
    name: "star-ratings-1-to-5",
    test: record => {
      const keys = ["cfraRating", "morningstarRating"].filter(key => !isBlank(record[key]))
      if (!keys.length) {
        return undefined
      }
      const bad = keys.filter(key => !/^[1-5] out of 5 stars$/.test(record[key]))
      return !bad.length || bad.map(key => `${key}="${record[key]}"`).join(" ")
    },
  },
  {
    name: "zacks-rank-and-grades",
    test: record => {
      const grades = ["zacksVGM", "zacksValue", "zacksGrowth", "zacksMomentum"]
      const present = ["zacksRank", ...grades].filter(key => !isBlank(record[key]))
      if (!present.length) {
        return undefined
      }
      const bad = present.filter(key =>
        key === "zacksRank" ? !/^[1-5]$/.test(record[key]) : !/^[A-F]$/.test(record[key])
      )
      return !bad.length || bad.map(key => `${key}=${record[key]}`).join(" ")
    },
  },
  {
    name: "fidelity-summary-score",
    test: record => {
      if (isBlank(record.fidelitySummaryScore)) {
        return undefined
      }
      const match = String(record.fidelitySummaryScore).match(/^(\d+(?:\.\d+)?) [A-Z ]+$/)
      return (match && Number(match[1]) <= 10) || `"${record.fidelitySummaryScore}"`
    },
  },
  {
    name: "wsj-targets-ordered",
    test: record => {
      const [low, median, average, high] = [
        record.wsjLowTarget,
        record.wsjMedianTarget,
        record.wsjAverageTarget,
        record.wsjHighTarget,
      ].map(toNumber)
      if ([low, median, average, high].some(Number.isNaN)) {
        return undefined
      }
      return (
        (low > 0 && low <= median && median <= high && low <= average && average <= high) ||
        `low=${low} median=${median} avg=${average} high=${high}`
      )
    },
  },
  {
    name: "targets-near-price",
    test: record => {
      const price = getLastPrice(record)
      const targets = ["wsjAverageTarget", "morningstarFairValue", "cfraTarget"].filter(
        key => toNumber(record[key]) > 0
      )
      if (!price || !targets.length) {
        return undefined
      }
      const bad = targets.filter(key => {
        const ratio = toNumber(record[key]) / price
        return ratio < 1 / 3 || ratio > 3
      })
      return (
        !bad.length || `price=${price} ` + bad.map(key => `${key}=${record[key]}`).join(" ")
      )
    },
  },
  {
    name: "wsj-chart-matches-total",
    test: record => {
      const charts = ["wsjChartCurrent", "wsjChartMonthAgo", "wsjChartThreeMonthAgo"]
      if (!charts.some(key => Array.isArray(record[key]))) {
        return undefined
      }
      const badShape = charts.filter(
        key =>
          !Array.isArray(record[key]) ||
          record[key].length !== 5 ||
          !record[key].every(n => Number.isInteger(n) && n >= 0)
      )
      if (badShape.length) {
        return `bad shape: ${badShape.join(",")}`
      }
      const total = sum(record.wsjChartCurrent)
      return (
        isBlank(record.wsjChartCurrentNum) ||
        total === toNumber(record.wsjChartCurrentNum) ||
        `sum=${total} wsjChartCurrentNum=${record.wsjChartCurrentNum}`
      )
    },
  },
  {
    name: "short-interest-sane",
    test: record => {
      if (isBlank(record.marketBeatShortPct)) {
        return undefined
      }
      const pct = toNumber(record.marketBeatShortPct)
      if (!(pct >= 0 && pct < 100)) {
        return `marketBeatShortPct=${record.marketBeatShortPct}`
      }
      const histories = [
        checkAligned(record, ["marketBeatShortHistoryDates", "marketBeatShortHistoryShares"]),
        checkAligned(record, [
          "marketBeatShortFloatHistoryDates",
          "marketBeatShortFloatHistoryPct",
          "marketBeatShortFloatHistoryPrice",
        ]),
      ].filter(result => typeof result === "string")
      return !histories.length || histories.join("; ")
    },
  },
  {
    name: "earnings-dates-sane",
    test: record => {
      const last = parseDate(record.zacksLastEarningsDate || "")
      const next = parseDate(record.zacksNextEarningsDate || "")
      if (!last.isValid() || !next.isValid()) {
        return undefined
      }
      const scrapedAt = moment(record.scrapeDataUpdatedAt || undefined)
      const detail = `last=${record.zacksLastEarningsDate} next=${record.zacksNextEarningsDate}`
      return (
        (last.isBefore(next) &&
          scrapedAt.diff(last, "days") <= 200 &&
          next.diff(scrapedAt, "days") >= -7 &&
          next.diff(scrapedAt, "days") <= 200) ||
        detail
      )
    },
  },
  {
    name: "dataroma-rating-matches-chart",
    test: record => {
      const { dataromaRatingChart: ratings, dataromaCountChart: counts } = record
      if (!Array.isArray(ratings) || !ratings.length || isBlank(record.dataromaRating)) {
        return undefined
      }
      const lastRating = ratings[ratings.length - 1]
      const lastCount = counts?.[counts.length - 1]
      const ratingOk = toNumber(record.dataromaRating) === lastRating
      const countOk = isBlank(record.dataromaCount) || record.dataromaCount === lastCount
      return (
        (ratingOk && countOk) ||
        `rating=${record.dataromaRating} chart=${lastRating} count=${record.dataromaCount} chart=${lastCount}`
      )
    },
  },
  {
    name: "dataroma-charts-shape",
    test: record => {
      const { dataromaRatingChart: ratings, dataromaCountChart: counts } = record
      if (!Array.isArray(ratings) && !Array.isArray(counts)) {
        return undefined
      }
      if (ratings?.length !== counts?.length || ratings.length > 20) {
        return `ratings=${ratings?.length} counts=${counts?.length}`
      }
      const badRating = ratings.some(n => typeof n !== "number" || !Number.isFinite(n))
      const badCount = counts.some(n => !Number.isInteger(n) || n < 0)
      // A quarter with no managers can only score 0.
      const zeroMismatch = counts.some((n, i) => n === 0 && ratings[i] !== 0)
      return (!badRating && !badCount && !zeroMismatch) || JSON.stringify({ ratings, counts })
    },
  },
  {
    name: "dataroma-count-matches-actions",
    test: record => {
      if (isBlank(record.dataromaCount) || typeof record.dataromaActions !== "string") {
        return undefined
      }
      const listed = record.dataromaActions
        .split("\n")
        .filter(line => line.startsWith(" [")).length
      return (
        listed === record.dataromaCount || `count=${record.dataromaCount} listed=${listed}`
      )
    },
  },
  {
    name: "previous-dataroma-rating-format",
    test: record => {
      if (isBlank(record.previousDataromaRating)) {
        return undefined
      }
      const value = String(record.previousDataromaRating)
      const match = value.match(
        /^([A-Z][a-z]{2} \d{1,2}, \d{4}): was -?\d+(?:\.\d+)? \(\d+ actions?\)$/
      )
      const date = match && moment(match[1], "MMM D, YYYY", true)
      return (date && date.isValid() && !date.isAfter(moment(), "day")) || `"${value}"`
    },
  },
]

/**
 * @param {Object} data - ticker-keyed records
 * @returns {{ name: string, checked: number, skipped: number, failures: {key: string, detail: string}[] }[]}
 */
const runChecks = data => {
  const records = Object.entries(data).filter(
    ([, record]) => record && typeof record === "object" && !Array.isArray(record)
  )
  return CHECKS.map(({ name, test }) => {
    const result = { name, checked: 0, skipped: 0, failures: [] }
    records.forEach(([key, record]) => {
      const isFailedScrape = !isBlank(record.error)
      const outcome =
        isFailedScrape && !["ticker-identity", "no-ticker-error"].includes(name)
          ? undefined
          : test(record, key)
      if (outcome === undefined) {
        result.skipped++
        return
      }
      result.checked++
      if (outcome !== true) {
        result.failures.push({ key, detail: typeof outcome === "string" ? outcome : "" })
      }
    })
    return result
  })
}

/**
 * Prints a pass/fail line per check. Never throws, so it is safe in exit handlers.
 * @param {string} location - JSON file of ticker-keyed records
 * @returns {number} number of failed checks (-1 if the checks could not run)
 */
const reportDataIntegrity = location => {
  try {
    const fs = require("fs")
    const name = path.basename(location)
    if (!fs.existsSync(location)) {
      console.log(`\nData integrity: ${name} not found, skipping`)
      return 0
    }
    const data = JSON.parse(fs.readFileSync(location, "utf8"))
    const results = runChecks(data)
    console.log(
      `\n========== DATA INTEGRITY: ${name} (${Object.keys(data).length} records) ==========`
    )
    results.forEach(({ name, checked, skipped, failures }) => {
      const counts =
        `${checked - failures.length}/${checked} ok` + (skipped ? `, ${skipped} skipped` : "")
      if (!failures.length) {
        console.log(`✅ ${name} (${counts})`)
        return
      }
      const shown = failures
        .slice(0, MAX_FAILURES_SHOWN)
        .map(({ key, detail }) => (detail ? `${key} (${detail})` : key))
      const more =
        failures.length > MAX_FAILURES_SHOWN
          ? ` +${failures.length - MAX_FAILURES_SHOWN} more`
          : ""
      console.log(`❌ ${name} (${counts}): ${shown.join(", ")}${more}`)
    })
    const failed = results.filter(({ failures }) => failures.length).length
    console.log(`${results.length - failed}/${results.length} checks passed`)
    return failed
  } catch (err) {
    console.error("Data integrity checks could not run:", err.message || err)
    return -1
  }
}

module.exports = { CHECKS, runChecks, reportDataIntegrity }

if (require.main === module) {
  require("../globalEnv")
  const target = process.argv[2] || "all"
  const locations = {
    staging: [STOCK_DATA_STAGING],
    committed: [STOCK_DATA_LOCATION],
    all: [STOCK_DATA_STAGING, STOCK_DATA_LOCATION],
  }[target]
  if (!locations) {
    console.error("Usage: npm run check-integrity -- [staging|committed]")
    process.exit(2)
  }
  const failed = locations.map(reportDataIntegrity).filter(n => n !== 0).length
  process.exit(failed ? 1 : 0)
}
