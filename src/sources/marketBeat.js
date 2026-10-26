const cheerio = require("cheerio")
const { handleFetch } = require("./util/www")
const { makePrettyDate, MessageError } = require("../util")

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// MarketBeat 301-redirects wrong-exchange URLs to the correct one, so we always
// hit NYSE and let the response settle on whichever exchange actually lists the
// ticker. Unknown tickers redirect to /stocks/ (no #history-table), which we
// detect downstream.
const buildForecastUrl = ticker =>
  `https://www.marketbeat.com/stocks/NYSE/${ticker}/forecast/`

const buildProfileUrl = ticker => `https://www.marketbeat.com/stocks/NYSE/${ticker}/`

const buildShortInterestUrl = ticker =>
  `https://www.marketbeat.com/stocks/NYSE/${ticker}/short-interest/`

const FETCH_HEADERS = {
  "user-agent": USER_AGENT,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
}

/**
 * @param {string} html
 * @returns {string}
 */
const parseSector = html => {
  const $ = cheerio.load(html)
  const sectorDt = $("dt")
    .toArray()
    .find(el => $(el).text().trim() === "Sector")
  if (!sectorDt) return ""
  return $(sectorDt).next("dd").find("a").first().text().trim()
}

/**
 * @param {string} raw e.g. "20260529000000"
 * @returns {string} zero-padded MM/DD/YY, e.g. "05/29/26"
 */
const formatShortDate = raw =>
  raw && raw.length >= 8 ? `${raw.slice(4, 6)}/${raw.slice(6, 8)}/${raw.slice(2, 4)}` : ""

/**
 * @param {number} fraction e.g. 0.1232
 * @returns {string} e.g. "12.32%", or "" when not finite
 */
const formatPct = fraction => (Number.isFinite(fraction) ? `${(fraction * 100).toFixed(2)}%` : "")

/**
 * Up to 5 years of the page's "Short Percent of Float" chart data, oldest first. The chart data is
 * embedded as a CSV string ("ActualDate,Date,Period,Percent") with exact fractions; reports
 * MarketBeat has no float figure for are 0 and are dropped. Prices come from the history table.
 * @param {string} html
 * @param {Map<number, number>} priceByDate "Price on Report Date" keyed by YYYYMMDD
 * @returns {{marketBeatShortFloatHistoryDates:string[], marketBeatShortFloatHistoryPct:number[], marketBeatShortFloatHistoryPrice:(number|null)[]}}
 */
const parseShortFloatSeries = (html, priceByDate) => {
  const match = html.match(/shortInterestFloatSeries\s*=\s*"((?:[^"\\]|\\.)*)"/)
  const points = match
    ? JSON.parse(`"${match[1]}"`)
        .trim()
        .split("\n")
        .slice(1)
        .map(line => {
          const [date, , , pct] = line.split(",")
          const [mm, dd, yyyy] = (date || "").split("/")
          return {
            date: `${mm}/${dd}/${(yyyy || "").slice(2)}`,
            yyyymmdd: Number(`${yyyy}${mm}${dd}`),
            pct: parseFloat(pct),
          }
        })
        .filter(({ yyyymmdd }) => Number.isFinite(yyyymmdd))
    : []

  const fiveYearsBeforeLatest = points.length ? points[points.length - 1].yyyymmdd - 50000 : 0
  const recent = points.filter(({ pct, yyyymmdd }) => pct > 0 && yyyymmdd > fiveYearsBeforeLatest)

  return {
    marketBeatShortFloatHistoryDates: recent.map(({ date }) => date),
    marketBeatShortFloatHistoryPct: recent.map(({ pct }) => Number(pct.toFixed(6))),
    marketBeatShortFloatHistoryPrice: recent.map(({ yyyymmdd }) => {
      const price = priceByDate.get(yyyymmdd)
      return Number.isFinite(price) ? price : null
    }),
  }
}

/**
 * @param {string} html
 * @returns {{marketBeatShortPct:string, marketBeatShortChange:string, marketBeatShortDate:string, marketBeatShortDatePrev:string, marketBeatShortPriceChange:string, marketBeatShortSentiment:string, marketBeatShortHistoryDates:string[], marketBeatShortHistoryShares:number[], marketBeatShortFloatHistoryDates:string[], marketBeatShortFloatHistoryPct:number[], marketBeatShortFloatHistoryPrice:(number|null)[]}}
 */
const parseShortInterest = html => {
  const $ = cheerio.load(html)

  const shortPctDt = $("dt")
    .toArray()
    .find(el => $(el).text().trim() === "Short Percent of Float")
  const marketBeatShortPct = shortPctDt ? $(shortPctDt).next("dd").text().trim() : ""

  // History table is the only table whose first header is "Report Date";
  // rows are newest-first.
  const historyTable = $("table")
    .toArray()
    .find(table => $(table).find("thead th").first().text().trim() === "Report Date")
  if (!historyTable) {
    return { marketBeatShortPct, ...parseShortFloatSeries(html, new Map()) }
  }

  const headers = $(historyTable)
    .find("thead th")
    .map((i, th) => $(th).text().trim())
    .get()
  const col = {
    date: headers.indexOf("Report Date"),
    shares: headers.indexOf("Total Shares Sold Short"),
    change: headers.indexOf("Change from Previous Report"),
    price: headers.indexOf("Price on Report Date"),
  }

  // data-sort-value carries exact values (e.g. change "0.1232"); visible text is rounded.
  // Cells without it fall back to their text with "$", "," and "%" stripped.
  const cellNum = (tds, idx) => {
    if (idx < 0) return NaN
    const td = tds.eq(idx)
    const sortValue = td.attr("data-sort-value")
    return parseFloat(sortValue ?? td.text().replace(/[$,%]/g, ""))
  }

  // Ad/newsletter rows are injected into the table body; real rows have a
  // "YYYYMMDDhhmmss" sort value on the date cell.
  const rows = $(historyTable)
    .find("tbody tr")
    .toArray()
    .map(row => $(row).find("td"))
    .filter(tds => /^\d{8,}$/.test(tds.eq(col.date).attr("data-sort-value") || ""))
    .map(tds => {
      const sortValue = tds.eq(col.date).attr("data-sort-value")
      return {
        date: formatShortDate(sortValue),
        yyyymmdd: Number(sortValue.slice(0, 8)),
        shares: cellNum(tds, col.shares),
        change: cellNum(tds, col.change),
        price: cellNum(tds, col.price),
      }
    })

  const [latest, prev] = rows
  const priceChange = latest && prev ? latest.price / prev.price - 1 : NaN
  const fiveYearsBeforeLatest = latest ? latest.yyyymmdd - 50000 : 0
  const historyRows = rows
    .filter(({ shares, yyyymmdd }) => Number.isFinite(shares) && yyyymmdd > fiveYearsBeforeLatest)
    .reverse()

  return {
    marketBeatShortPct,
    marketBeatShortChange: formatPct(latest?.change),
    marketBeatShortDate: latest?.date || "",
    marketBeatShortDatePrev: prev?.date || "",
    marketBeatShortPriceChange: formatPct(priceChange),
    marketBeatShortSentiment: formatPct(latest?.change - priceChange),
    marketBeatShortHistoryDates: historyRows.map(({ date }) => date),
    marketBeatShortHistoryShares: historyRows.map(({ shares }) => shares),
    ...parseShortFloatSeries(html, new Map(rows.map(({ yyyymmdd, price }) => [yyyymmdd, price]))),
  }
}

/** Values match Google Sheet conditional-format "Text contains" rules. */
const MARKETBEAT_SECTOR_MAP = {
  "Basic Materials": "Materials",
  "Computer and Technology": "Tech",
  "Communication Services": "Communications",
  "Consumer Cyclical": "Discretionary",
  "Consumer Discretionary": "Discretionary",
  "Consumer Staples": "Staples",
  Finance: "Financial",
  "Financial Services": "Financial",
  Industrials: "Industrials",
  Medical: "Healthcare",
  Utilities: "Utilities",
  Aerospace: "Industrials",
  "Auto/Tires/Trucks": "Discretionary",
  "Business Services": "Industrials",
  Construction: "Industrials",
  Manufacturing: "Industrials",
  "Real Estate": "Financial",
  "Retail/Wholesale": "Discretionary",
  Transportation: "Industrials",
  "Multi-Sector Conglomerates": "Industrials",
  Services: "Industrials",
}

/**
 * @param {string} marketBeatSector
 * @returns {string}
 */
const mapSectorForSheet = marketBeatSector =>
  marketBeatSector ? MARKETBEAT_SECTOR_MAP[marketBeatSector] || marketBeatSector : ""

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
 * @param {string} dateStr e.g. "5/20/2026"
 * @returns {Date|null}
 */
const parseMbFormattedDate = dateStr => {
  const [m, d, y] = dateStr.split("/").map(Number)
  if (!m || !d || !y) return null
  return new Date(y, m - 1, d)
}

/** @param {string} dateStr */
const isWithinLastFourMonths = dateStr => {
  const date = parseMbFormattedDate(dateStr)
  if (!date) return true
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 4)
  return date >= cutoff
}

/** @param {{date:string}} a @param {{date:string}} b */
const compareByDateDesc = (a, b) => {
  const dateA = parseMbFormattedDate(a.date)
  const dateB = parseMbFormattedDate(b.date)
  if (!dateA && !dateB) return 0
  if (!dateA) return 1
  if (!dateB) return -1
  return dateB - dateA
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
 * @param {number} from
 * @param {number} to
 * @returns {string}
 */
const priceChangeEmoji = (from, to) => {
  if (to === from) return "➝"
  const pctChange = ((to - from) / from) * 100
  if (pctChange >= 10) return "☄️"
  if (pctChange > 0) return "🍀"
  if (pctChange > -10) return "🐻"
  return "😭"
}

/**
 * @param {number|null} from
 * @param {number|null} to
 * @returns {string}
 */
const formatPriceChange = (from, to) => {
  if (from && to) return `$${from}${priceChangeEmoji(from, to)}$${to}`
  if (to) return `$${to}`
  return ""
}

const hasPriceTarget = row => row.targetTo

const hasPriceTargetChange = row =>
  row.targetFrom && row.targetTo && row.targetFrom !== row.targetTo

const hasFirstPriceTarget = row => !row.targetFrom && row.targetTo

const hasReiteratedPriceTarget = row =>
  row.targetFrom && row.targetTo && row.targetFrom === row.targetTo

const hasRating = row => Boolean(row.rating)

const hasRatingChange = row => row.rating.includes("➝")

const isMorganStanley = row => row.firm === "Morgan Stanley"

/**
 * History table is newest-first; first Morgan Stanley row with a rating wins.
 * @param {Array<{firm:string,rating:string,date:string}>} rows
 * @returns {string}
 */
const getMorganStanleyRating = rows => {
  const row = rows.find(r => isMorganStanley(r) && hasRating(r))
  if (!row) return ""
  return row.date ? `${row.date} ${row.rating}` : row.rating
}

/**
 * History table is newest-first; first Morgan Stanley row with a target wins.
 * @param {Array<{firm:string,targetFrom:number|null,targetTo:number|null,date:string}>} rows
 * @returns {{firm:string,targetFrom:number|null,targetTo:number|null,date:string}|undefined}
 */
const getMorganStanleyPriceTargetRow = rows =>
  rows.find(r => isMorganStanley(r) && hasPriceTarget(r))

/**
 * @param {Array<{firm:string,targetFrom:number|null,targetTo:number|null,date:string}>} rows
 * @returns {string}
 */
const getMorganStanleyPriceTarget = rows => {
  const row = getMorganStanleyPriceTargetRow(rows)
  if (!row) return ""
  const target = formatPriceChange(row.targetFrom, row.targetTo)
  return row.date ? `${row.date} ${target}` : target
}

/**
 * @param {Array<{firm:string,targetTo:number|null}>} rows
 * @returns {string}
 */
const getMorganStanleyCurrentPriceTargetNum = rows => {
  const row = getMorganStanleyPriceTargetRow(rows)
  return row?.targetTo != null ? String(row.targetTo) : ""
}

const FIRM_LENGTH = 8

/**
 * @param {string} html
 * @returns {Array<{date:string,firm:string,analyst:string,action:string,rating:string,ratingFrom:string,ratingTo:string,targetFrom:number|null,targetTo:number|null,upside:string}>}
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
        rating: tds.eq(4).text().trim(),
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

/**
 * @param {string} raw
 * @returns {string} e.g. "340.12", or "" when not finite
 */
const formatTargetNumber = raw => {
  const num = parseFloat(String(raw).replace(/[^0-9.]/g, ""))
  return Number.isFinite(num) ? num.toFixed(2) : ""
}

/**
 * Published count of analysts in the consensus price-target set (last 12 months).
 * This is not `marketBeatChartCurrentNum`, which counts current ratings.
 * @param {string} text
 * @returns {number|""}
 */
const parseConsensusCount = text => {
  const faq = text.match(/research reports of (\d+) Wall Street/i)
  const body = text.match(
    /According to the (\d+) analysts['’] twelve-month price targets/i,
  )
  const n = Number((faq || body)?.[1])
  return Number.isInteger(n) && n > 0 ? n : ""
}

/**
 * Consensus low / average / high from the forecast page FAQ or body copy.
 * MarketBeat does not publish a median.
 * @param {string} html
 * @returns {{marketBeatLowTarget:string, marketBeatAverageTarget:string, marketBeatHighTarget:string, marketBeatPriceTargets:string, marketBeatPriceTargetNum:number|""}}
 */
const parseConsensusTargets = html => {
  const empty = {
    marketBeatLowTarget: "",
    marketBeatAverageTarget: "",
    marketBeatHighTarget: "",
    marketBeatPriceTargets: "",
    marketBeatPriceTargetNum: "",
  }
  const text = html.replace(/<[^>]+>/g, " ")
  const faq = text.match(
    /average twelve-month stock price forecast for .+? is \$([0-9,.]+), with a high forecast of \$([0-9,.]+) and a low forecast of \$([0-9,.]+)/i,
  )
  const body = text.match(
    /the average price target is \$([0-9,.]+)[\s\S]{0,160}?highest price target for \S+ is \$([0-9,.]+)[\s\S]{0,120}?lowest price target for \S+ is \$([0-9,.]+)/i,
  )
  const match = faq || body
  if (!match) return empty
  const average = formatTargetNumber(match[1])
  const high = formatTargetNumber(match[2])
  const low = formatTargetNumber(match[3])
  if (!average || !high || !low) return empty
  return {
    marketBeatLowTarget: low,
    marketBeatAverageTarget: average,
    marketBeatHighTarget: high,
    marketBeatPriceTargets: `$${low} - $${average} - $${high}`,
    marketBeatPriceTargetNum: parseConsensusCount(text),
  }
}

const formatPriceTargets = rows => {
  const priceTargets = rows.filter(hasPriceTarget)
  const changedTargets = priceTargets.filter(hasPriceTargetChange)
  const recentChangedTargets = changedTargets.filter(row => isWithinLastFourMonths(row.date))
  const olderChangedTargets = changedTargets.filter(row => !isWithinLastFourMonths(row.date))
  const firstTargets = priceTargets.filter(hasFirstPriceTarget)
  const reiteratedTargets = priceTargets.filter(hasReiteratedPriceTarget)
  const otherTargets = [...olderChangedTargets, ...firstTargets, ...reiteratedTargets].sort(
    compareByDateDesc,
  )

  return [
    formatPriceTargetRows(recentChangedTargets),
    formatPriceTargetRows(otherTargets),
  ]
    .filter(Boolean)
    .join("\n\n")
}

const formatAnalystRatingRows = rows =>
  rows
    .map(row => {
      const firm = formatFirm(row.firm)
      const rating = row.rating
      return `${firm} | ${rating} | ${row.date}`
    })
    .join("\n")

const formatAnalystRatings = rows => {
  const ratings = rows.filter(hasRating)
  const changedRatings = ratings.filter(hasRatingChange)
  const recentChangedRatings = changedRatings.filter(row => isWithinLastFourMonths(row.date))
  const olderChangedRatings = changedRatings.filter(row => !isWithinLastFourMonths(row.date))
  const otherRatings = ratings.filter(row => !hasRatingChange(row))
  const chronologicalOthers = [...olderChangedRatings, ...otherRatings].sort(compareByDateDesc)

  return [
    formatAnalystRatingRows(recentChangedRatings),
    formatAnalystRatingRows(chronologicalOthers),
  ]
    .filter(Boolean)
    .join("\n\n")
}

/** Sheet order matches WSJ: Sell → Underweight → Hold → Overweight → Buy. */
const RATING_BUCKETS = {
  sell: 0,
  "strong sell": 0,
  underweight: 1,
  underperform: 1,
  "moderate sell": 1,
  reduce: 1,
  negative: 1,
  hold: 2,
  neutral: 2,
  "market perform": 2,
  "equal weight": 2,
  "sector perform": 2,
  "peer perform": 2,
  "sector weight": 2,
  "in-line": 2,
  inline: 2,
  mixed: 2,
  cautious: 2,
  "market weight": 2,
  overweight: 3,
  outperform: 3,
  "sector outperform": 3,
  "market outperform": 3,
  positive: 3,
  accumulate: 3,
  "moderate buy": 3,
  buy: 4,
  "strong-buy": 4,
  "strong buy": 4,
}

/**
 * @param {string} rating
 * @returns {number} 0–4, or -1 when unmapped
 */
const ratingBucket = rating => {
  const raw = (rating || "").trim().toLowerCase()
  const normalized = raw.replace(/\s*\([^)]*\)\s*$/, "").trim()
  if (normalized in RATING_BUCKETS) return RATING_BUCKETS[normalized]
  if (raw in RATING_BUCKETS) return RATING_BUCKETS[raw]
  return -1
}

/**
 * @param {{ratingTo?:string,rating?:string}} row
 * @returns {string}
 */
const currentRating = row => {
  const to = row.ratingTo && row.ratingTo !== "N/A" ? row.ratingTo : ""
  const fallback = (row.rating || "").split("➝").pop().trim()
  const rating = to || fallback
  return rating === "N/A" ? "" : rating
}

/**
 * Latest rating per firm as of `asOf` (inclusive). History is newest-first but
 * we still compare dates so a shuffled table can't pick a stale row.
 * @param {Array<{date:string,firm:string,ratingTo?:string,rating?:string}>} rows
 * @param {Date|null} asOf
 * @returns {Map<string, string>}
 */
const latestRatingPerFirm = (rows, asOf) => {
  const latest = new Map()
  for (const row of rows) {
    const firm = row.firm
    const rating = currentRating(row)
    if (!firm || !rating) continue
    const date = parseMbFormattedDate(row.date)
    if (asOf && date && date > asOf) continue
    const prev = latest.get(firm)
    if (!prev || (date && (!prev.date || date > prev.date))) {
      latest.set(firm, { date, rating })
    }
  }
  return new Map([...latest].map(([firm, { rating }]) => [firm, rating]))
}

/**
 * @param {Iterable<string>} ratings
 * @returns {number[]}
 */
const countRatingBuckets = ratings => {
  const counts = [0, 0, 0, 0, 0]
  for (const rating of ratings) {
    const bucket = ratingBucket(rating)
    if (bucket >= 0) counts[bucket] += 1
  }
  return counts
}

/**
 * @param {Date} now
 * @param {number} months
 * @returns {Date}
 */
const asOfMonthsAgo = (now, months) =>
  new Date(now.getFullYear(), now.getMonth() - months, now.getDate())

/**
 * 5-bucket charts from MarketBeat's per-firm history, same shape as `wsjChart*`.
 * @param {Array<{date:string,firm:string,ratingTo?:string,rating?:string}>} rows
 * @param {Date} [now]
 * @returns {{marketBeatChartCurrent:number[], marketBeatChartCurrentNum:number, marketBeatChartMonthAgo:number[], marketBeatChartThreeMonthAgo:number[]}|{}}
 */
const buildAnalystCharts = (rows, now = new Date()) => {
  const current = countRatingBuckets(latestRatingPerFirm(rows, null).values())
  const total = current.reduce((sum, n) => sum + n, 0)
  if (!total) return {}
  return {
    marketBeatChartCurrent: current,
    marketBeatChartCurrentNum: total,
    marketBeatChartMonthAgo: countRatingBuckets(
      latestRatingPerFirm(rows, asOfMonthsAgo(now, 1)).values(),
    ),
    marketBeatChartThreeMonthAgo: countRatingBuckets(
      latestRatingPerFirm(rows, asOfMonthsAgo(now, 3)).values(),
    ),
  }
}

/**
 * @param {string} url
 * @returns {Promise<Response>}
 */
const fetchMarketBeatPage = url =>
  fetch(url, { headers: FETCH_HEADERS, redirect: "follow" })

/**
 * @param {object} logger
 * @param {string} ticker
 * @returns {Promise<{sector:string, marketBeatTargetsUpdatedAt:string, marketBeatTargets:object[], marketBeatTargetsFormatted:string, marketBeatAnalystRatings:object[], marketBeatAnalystRatingsFormatted:string, morganStanleyRating?:string, morganStanleyPriceTarget:string, morganStanleyCurrentPriceTargetNum:string, marketBeatShortPct?:string, marketBeatShortChange?:string, marketBeatShortDate?:string, marketBeatShortDatePrev?:string, marketBeatShortPriceChange?:string, marketBeatShortSentiment?:string, marketBeatShortHistoryDates?:string[], marketBeatShortHistoryShares?:number[], marketBeatShortFloatHistoryDates?:string[], marketBeatShortFloatHistoryPct?:number[], marketBeatShortFloatHistoryPrice?:(number|null)[]}>}
 */
const fetchData = async (logger, ticker) => {
  const [forecastResponse, profileResponse, shortInterestResponse] = await Promise.all([
    fetchMarketBeatPage(buildForecastUrl(ticker)),
    fetchMarketBeatPage(buildProfileUrl(ticker)),
    fetchMarketBeatPage(buildShortInterestUrl(ticker)),
  ])

  if (!forecastResponse.ok) {
    throw new MessageError(
      `MarketBeat forecast fetch failed: HTTP ${forecastResponse.status}`,
      "marketBeat.fetchData",
    )
  }

  if (!profileResponse.ok) {
    throw new MessageError(
      `MarketBeat profile fetch failed: HTTP ${profileResponse.status}`,
      "marketBeat.fetchData",
    )
  }

  if (!shortInterestResponse.ok) {
    throw new MessageError(
      `MarketBeat short interest fetch failed: HTTP ${shortInterestResponse.status}`,
      "marketBeat.fetchData",
    )
  }

  const [forecastHtml, profileHtml, shortInterestHtml] = await Promise.all([
    forecastResponse.text(),
    profileResponse.text(),
    shortInterestResponse.text(),
  ])

  const sector = mapSectorForSheet(parseSector(profileHtml))
  if (!sector) {
    logger.warn(`No MarketBeat sector found for ${ticker}`)
  }

  // Drop empty short fields so a missing MarketBeat page can't clobber
  // previously-scraped values during the merge write-out.
  const shortInterest = Object.fromEntries(
    Object.entries(parseShortInterest(shortInterestHtml)).filter(([, value]) => value),
  )
  if (!shortInterest.marketBeatShortDate) {
    logger.warn(`No MarketBeat short interest found for ${ticker}`)
  }

  const marketBeatTargets = parseHistoryRows(forecastHtml)
  const consensusTargets = parseConsensusTargets(forecastHtml)
  if (!consensusTargets.marketBeatPriceTargets) {
    logger.warn(`No MarketBeat consensus targets found for ${ticker}`)
  }

  if (!marketBeatTargets.length) {
    logger.warn(`No MarketBeat target history found for ${ticker}`)
    return {
      sector,
      marketBeatTargetsUpdatedAt: makePrettyDate(),
      marketBeatTargets: [],
      marketBeatTargetsFormatted: "",
      marketBeatAnalystRatings: [],
      marketBeatAnalystRatingsFormatted: "",
      morganStanleyPriceTarget: "",
      morganStanleyCurrentPriceTargetNum: "",
      ...consensusTargets,
      ...shortInterest,
    }
  }

  const marketBeatAnalystRatings = marketBeatTargets.filter(hasRating)
  const marketBeatAnalystRatingsFormatted = formatAnalystRatings(marketBeatAnalystRatings)
  const morganStanleyRating = getMorganStanleyRating(marketBeatTargets)
  const morganStanleyPriceTarget = getMorganStanleyPriceTarget(marketBeatTargets)
  const morganStanleyCurrentPriceTargetNum =
    getMorganStanleyCurrentPriceTargetNum(marketBeatTargets)

  const marketBeatTargetsFormatted = formatPriceTargets(marketBeatTargets)
  const analystCharts = buildAnalystCharts(marketBeatAnalystRatings)

  return {
    sector,
    marketBeatTargetsUpdatedAt: makePrettyDate(),
    marketBeatTargets,
    marketBeatTargetsFormatted,
    marketBeatAnalystRatings,
    marketBeatAnalystRatingsFormatted,
    ...analystCharts,
    // Omit when empty: dailyUpdate/updateMarketBeat spread this raw into the
    // merge write-out, and "" would clobber a Fidelity-sourced rating.
    ...(morganStanleyRating ? { morganStanleyRating } : {}),
    morganStanleyPriceTarget,
    morganStanleyCurrentPriceTargetNum,
    ...consensusTargets,
    ...shortInterest,
  }
}

exports.fetch = ticker => handleFetch(fetchData, ticker, "MARKETBEAT")
exports.buildAnalystCharts = buildAnalystCharts
exports.ratingBucket = ratingBucket
exports.parseConsensusTargets = parseConsensusTargets

/**
 * MarketBeat's "Price on Report Date" is not split-adjusted, so swap in Yahoo's split-adjusted
 * daily closes (same day, or the closest prior trading day for weekends/holidays). The price
 * change only falls back to MarketBeat's when Yahoo lacks a date; history points without a
 * Yahoo close become null.
 * @param {Object} marketBeatData result of `fetch`
 * @param {{yahooDailyPricesDates?:string[], yahooDailyPrices?:string[]}} yahooPrices "M/D/YYYY" dates
 * @returns {Object} marketBeatData with adjusted short-interest price fields
 */
exports.applySplitAdjustedPrices = (marketBeatData, yahooPrices) => {
  const { yahooDailyPricesDates = [], yahooDailyPrices = [] } = yahooPrices || {}
  const closeByDate = new Map(
    yahooDailyPricesDates.map((date, i) => [date, parseFloat(yahooDailyPrices[i])])
  )
  /** @param {string} mmddyy e.g. "09/15/26" */
  const closeOnOrBefore = mmddyy => {
    if (!mmddyy) return null
    const [mm, dd, yy] = mmddyy.split("/").map(Number)
    const date = new Date(2000 + yy, mm - 1, dd)
    for (let i = 0; i < 5; i++) {
      const close = closeByDate.get(
        `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
      )
      if (Number.isFinite(close)) return close
      date.setDate(date.getDate() - 1)
    }
    return null
  }

  const adjusted = { ...marketBeatData }
  if (Array.isArray(marketBeatData.marketBeatShortFloatHistoryDates)) {
    adjusted.marketBeatShortFloatHistoryPrice =
      marketBeatData.marketBeatShortFloatHistoryDates.map(closeOnOrBefore)
  }

  const latest = closeOnOrBefore(marketBeatData.marketBeatShortDate)
  const prev = closeOnOrBefore(marketBeatData.marketBeatShortDatePrev)
  const shortChange = parseFloat(marketBeatData.marketBeatShortChange) / 100
  if (latest && prev) {
    const priceChange = latest / prev - 1
    adjusted.marketBeatShortPriceChange = formatPct(priceChange)
    if (Number.isFinite(shortChange)) {
      adjusted.marketBeatShortSentiment = formatPct(shortChange - priceChange)
    }
  }
  return adjusted
}
