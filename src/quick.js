// One-shot test run of the "start" app, meant for agents and quick manual checks:
//   npm run quick -- AAPL MSFT
// Reuses (or launches) the Chrome debug target, refreshes ws.json, opens Fidelity + Merrill
// login tabs (Press Enter when done; skipped if both are already logged in), scrapes the given tickers into the staging file,
// prints a per-ticker summary, and exits non-zero on failure.
const fs = require("fs")
const { isValidTicker } = require("./sources/util/str")

const USAGE = "Usage: npm run quick -- TICKER [TICKER ...]    e.g. npm run quick -- AAPL MSFT"
const MAX_STRING_LENGTH = 200
const MAX_ARRAY_LENGTH = 5

/**
 * @param {string[]} args
 * @returns {string[]} upper-cased, de-duplicated tickers
 */
const parseTickers = args => {
  const tickers = args
    .flatMap(arg => arg.split(/[\s,]+/))
    .map(ticker => ticker.trim().toUpperCase())
    .filter(Boolean)
  return [...new Set(tickers)]
}

/**
 * Keep the summary readable: long strings and arrays (e.g. daily prices) are abbreviated.
 * @param {Object} data
 * @returns {string}
 */
const formatRecord = data =>
  JSON.stringify(
    data,
    (key, value) => {
      if (Array.isArray(value) && value.length > MAX_ARRAY_LENGTH) {
        return `[${value.length} items: ${value.slice(0, 2).join(", ")} ...]`
      }
      if (typeof value === "string" && value.length > MAX_STRING_LENGTH) {
        return value.slice(0, MAX_STRING_LENGTH) + "..."
      }
      return value
    },
    2
  )

/**
 * @param {import('./scrapeDataForTickers').ScrapeResult[]} results
 * @param {string} stagingLocation
 * @returns {number} exit code
 */
const summarize = (results, stagingLocation) => {
  console.log("\n================ QUICK SCRAPE SUMMARY ================")
  for (const { ticker, ok, data, error } of results) {
    if (!ok) {
      console.log(`❌ ${ticker}: ${error && error.message ? error.message : error}`)
      continue
    }
    const sourceErrors = Object.keys(data).filter(
      key => key.startsWith("error_") || key.startsWith("warnError_")
    )
    console.log(
      `✅ ${ticker}: ${Object.keys(data).length} fields` +
        (sourceErrors.length ? ` — source errors: ${sourceErrors.join(", ")}` : "")
    )
    console.log(formatRecord(data))
  }
  console.log(`\nFull records written to ${stagingLocation}`)
  const failed = results.filter(({ ok }) => !ok)
  console.log(
    failed.length
      ? `${failed.length}/${results.length} tickers failed`
      : `All ${results.length} tickers scraped`
  )
  console.log("======================================================\n")
  return failed.length ? 1 : 0
}

const main = async () => {
  const tickers = parseTickers(process.argv.slice(2))
  if (!tickers.length) {
    console.error(USAGE)
    return 2
  }
  const invalid = tickers.filter(ticker => !isValidTicker(ticker))
  if (invalid.length) {
    console.error(`Invalid tickers: ${invalid.join(", ")}\n${USAGE}`)
    return 2
  }

  const scrapbook = process.env.STOCK_SCRAPBOOK_LOCATION
  if (!scrapbook || !fs.existsSync(scrapbook)) {
    const problem = scrapbook ? `does not exist (${scrapbook})` : "is not set"
    console.error(
      `STOCK_SCRAPBOOK_LOCATION ${problem}. ` +
        "Point it at the Google Drive stock-scrapbook directory (see README)."
    )
    return 2
  }

  require("../globalEnv")
  const start = require("./apps/start")

  const results = await start({ tickers })
  if (!results) {
    console.error("The start app did not complete (see error above).")
    return 1
  }
  return summarize(results, STOCK_DATA_STAGING)
}

module.exports = { parseTickers, formatRecord, summarize }

if (require.main === module) {
  main()
    .then(code => process.exit(code))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
}
