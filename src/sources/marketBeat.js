const cheerio = require("cheerio")
const { handleFetch } = require("./util/www")
const { makePrettyDate, MessageError } = require("../util")

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// MarketBeat 301-redirects wrong-exchange URLs to the correct one, so we always
// hit NYSE and let the response settle on whichever exchange actually lists the
// ticker. Unknown tickers redirect to /stocks/ (no #history-table), which we
// detect downstream.
const buildUrl = ticker => `https://www.marketbeat.com/stocks/NYSE/${ticker}/forecast/`

/**
 * @param {string|undefined} raw e.g. "20260519000000"
 * @returns {string}
 */
const formatMbDate = raw => {
  if (!raw || raw.length < 8) return ""
  const m = parseInt(raw.slice(4, 6), 10)
  const d = parseInt(raw.slice(6, 8), 10)
  return `${m}/${d}/${raw.slice(0, 4)}`
}

/**
 * Parse a "$X.XX" cell value. MarketBeat uses $0.00 to mean "no prior target
 * on record" (initiations, reiterations from before they started tracking).
 * @param {string|undefined} s
 * @returns {number|null}
 */
const parsePrice = s => {
  if (!s) return null
  const num = parseFloat(s.replace(/[^0-9.]/g, ""))
  return Number.isFinite(num) && num !== 0 ? num : null
}

/**
 * @param {number|null} from
 * @param {number|null} to
 * @returns {string}
 */
const formatPriceChange = (from, to) => {
  if (from && to) {
    const arrow = to > from ? "⭐️" : to < from ? "😭" : "➝"
    return `$${from}${arrow}$${to}`
  }
  if (to) return `$${to}`
  return ""
}

const hasPriceTarget = row => row.targetTo

const hasPriceTargetChange = row =>
  row.targetFrom && row.targetTo && row.targetFrom !== row.targetTo

const hasFirstPriceTarget = row => !row.targetFrom && row.targetTo

const hasReiteratedPriceTarget = row =>
  row.targetFrom && row.targetTo && row.targetFrom === row.targetTo

const isRating = rating => rating && rating !== "N/A"

const formatRatingChange = (from, to) => {
  const previous = isRating(from) ? from : ""
  const current = isRating(to) ? to : ""

  if (previous && current) return `${previous}➝${current}`
  return current || previous
}

const hasRating = row => isRating(row.ratingFrom) || isRating(row.ratingTo)

const hasRatingChange = row =>
  isRating(row.ratingFrom) &&
  isRating(row.ratingTo) &&
  row.ratingFrom.toLowerCase() !== row.ratingTo.toLowerCase()

const FIRM_LENGTH = 8

/**
 * @param {string} html
 * @returns {Array<{date:string,firm:string,analyst:string,action:string,ratingFrom:string,ratingTo:string,targetFrom:number|null,targetTo:number|null,upside:string}>}
 */
const parseHistoryRows = html => {
  const $ = cheerio.load(html)
  return $("#history-table tbody tr")
    .toArray()
    .filter(tr => $(tr).find("td").first().attr("data-sort-value"))
    .map(tr => {
      const tds = $(tr).find("td")
      const [firm = ""] = (tds.eq(1).attr("data-clean") || "").split("|")
      const [analyst = ""] = (tds.eq(2).attr("data-clean") || "").split("|")
      const [ratingFrom = "", ratingTo = ""] = (tds.eq(4).attr("data-clean") || "").split("|")
      const [targetFromRaw = "", targetToRaw = ""] = (
        tds.eq(5).attr("data-clean") || ""
      ).split("|")
      return {
        date: formatMbDate(tds.eq(0).attr("data-sort-value")),
        firm,
        analyst,
        action: tds.eq(3).text().trim(),
        ratingFrom,
        ratingTo,
        targetFrom: parsePrice(targetFromRaw),
        targetTo: parsePrice(targetToRaw),
        upside: tds.eq(6).text().trim(),
      }
    })
}

const formatFirm = firm => (firm || "").substring(0, FIRM_LENGTH).trimEnd()

const formatPriceTargetRows = rows =>
  rows
    .map(
      row =>
        `${formatFirm(row.firm)} | ${formatPriceChange(row.targetFrom, row.targetTo)} | ${
          row.date
        }`,
    )
    .join("\n")

const formatPriceTargets = rows => {
  const priceTargets = rows.filter(hasPriceTarget)
  const changedTargets = priceTargets.filter(hasPriceTargetChange)
  const firstTargets = priceTargets.filter(hasFirstPriceTarget)
  const reiteratedTargets = priceTargets.filter(hasReiteratedPriceTarget)

  return [
    formatPriceTargetRows(changedTargets),
    formatPriceTargetRows(firstTargets),
    formatPriceTargetRows(reiteratedTargets),
  ]
    .filter(Boolean)
    .join("\n\n")
}

const formatAnalystRatingRows = rows =>
  rows
    .map(row => {
      const firm = formatFirm(row.firm)
      const rating = formatRatingChange(row.ratingFrom, row.ratingTo)
      return `${firm} | ${rating} | ${row.date}`
    })
    .join("\n")

const formatAnalystRatings = rows => {
  const ratings = rows.filter(hasRating)
  const changedRatings = ratings.filter(hasRatingChange)
  const otherRatings = ratings.filter(row => !hasRatingChange(row))

  return [formatAnalystRatingRows(changedRatings), formatAnalystRatingRows(otherRatings)]
    .filter(Boolean)
    .join("\n\n")
}

/**
 * @param {object} logger
 * @param {string} ticker
 * @returns {Promise<{marketBeatTargetsUpdatedAt:string, marketBeatTargets:object[], marketBeatTargetsFormatted:string, marketBeatAnalystRatings:object[], marketBeatAnalystRatingsFormatted:string}>}
 */
const fetchData = async (logger, ticker) => {
  const response = await fetch(buildUrl(ticker), {
    headers: {
      "user-agent": USER_AGENT,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  })

  if (!response.ok) {
    throw new MessageError(
      `MarketBeat fetch failed: HTTP ${response.status}`,
      "marketBeat.fetchData",
    )
  }

  const html = await response.text()
  const marketBeatTargets = parseHistoryRows(html)

  if (!marketBeatTargets.length) {
    logger.warn(`No MarketBeat target history found for ${ticker}`)
    return {
      marketBeatTargetsUpdatedAt: makePrettyDate(),
      marketBeatTargets: [],
      marketBeatTargetsFormatted: "",
      marketBeatAnalystRatings: [],
      marketBeatAnalystRatingsFormatted: "",
    }
  }

  const marketBeatAnalystRatings = marketBeatTargets.filter(hasRating)
  const marketBeatAnalystRatingsFormatted = formatAnalystRatings(marketBeatAnalystRatings)

  const marketBeatTargetsFormatted = formatPriceTargets(marketBeatTargets)

  return {
    marketBeatTargetsUpdatedAt: makePrettyDate(),
    marketBeatTargets,
    marketBeatTargetsFormatted,
    marketBeatAnalystRatings,
    marketBeatAnalystRatingsFormatted,
  }
}

exports.fetch = ticker => handleFetch(fetchData, ticker, "MARKETBEAT")
