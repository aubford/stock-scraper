const scrapeDataForTicker = require("./scrapeDataForTicker")
const { scrapbookWriteOut, pause, writeFile, formatErrorObject } = require("./util")
const { yahoo } = require("./api")
const moment = require("moment")
const Logger = require("./Logger")

const metaWriteBadFetches = badFetches => {
  /** @type {*} */
  const existingFile = fs.readFileSync(META_LOCATION)
  const existingMeta = JSON.parse(existingFile)

  writeFile(META_LOCATION, {
    ...existingMeta,
    badFetches: existingMeta.badFetches.concat({
      date: moment().format("MMM D YY: h:mm a"),
      tickers: badFetches,
    }),
  })
}

module.exports = async (allTickers, browser, shouldMerge) => {
  await yahoo.fetchVooIndexHistoricalPrices()
  let badFetches = []
  const newStockData = {}

  const scrapeDataForTickers = async tickers => {
    console.log("Searching for tickers:", tickers)

    for (const ticker of tickers) {
      const logger = new Logger(ticker, "* SCRAPING")
      try {
        newStockData[ticker] = await scrapeDataForTicker(ticker, browser)
        logger.log(`* TICKER COMPLETED OK: ${ticker}`)
      } catch (error) {
        logger.error("xxx FAIL xxx", error)
        badFetches.push(ticker)
        newStockData[ticker] = formatErrorObject(error)
      }
    }
  }

  await scrapeDataForTickers(allTickers)

  badFetches = badFetches.concat(
    Object.values(newStockData)
      .filter(s => s.error)
      .map(s => s.ticker)
  )

  if (badFetches.length) {
    console.log(`Fetching badFetches: ${badFetches.join(", ")}`)

    await pause(30 * 1000)

    const refetchTickers = [...badFetches]
    badFetches = []

    await scrapeDataForTickers(refetchTickers)

    // if there are still bad fetches after second pass, log them in meta
    if (badFetches.length) {
      metaWriteBadFetches(badFetches)
    }
  }

  scrapbookWriteOut(newStockData, shouldMerge)
}
