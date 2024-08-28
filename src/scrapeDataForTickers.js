const scrapeDataForTicker = require("./scrapeDataForTicker")
const { stagingWriteOut, pause, writeJsonFile, formatErrorObject } = require("./util")
const { yahoo } = require("./sources")
const moment = require("moment")

const metaWriteBadFetches = badFetches => {
  /** @type {*} */
  const existingFile = fs.readFileSync(META_LOCATION)
  const existingMeta = JSON.parse(existingFile)

  writeJsonFile(META_LOCATION, {
    ...existingMeta,
    badFetches: existingMeta.badFetches.concat({
      date: moment().format("MMM D YY: h:mm a"),
      tickers: badFetches,
    }),
  })
}

module.exports = async (allTickers, browser) => {
  await yahoo.fetchVooIndexHistoricalPrices()
  let badFetches = []
  const newStockData = {}

  const scrapeDataForTickers = async tickers => {
    console.log("Searching for tickers:", tickers)

    for (const ticker of tickers) {
      try {
        newStockData[ticker] = await scrapeDataForTicker(ticker, browser)
        stagingWriteOut(newStockData)
        console.log(`🎉 SCRAPE SUCCESS: ${ticker} 🎉`)
      } catch (error) {
        console.error("🚨🚨🚨 SCRAPE FAIL 🚨🚨🚨", error)
        badFetches.push(ticker)
        newStockData[ticker] = formatErrorObject(error, ticker)
      }
    }
  }

  await scrapeDataForTickers(allTickers)

  badFetches = badFetches.concat(
    Object.entries(newStockData)
      .filter(([, { error }]) => error)
      .map(([ticker]) => ticker)
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
}
