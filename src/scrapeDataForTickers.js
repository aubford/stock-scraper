const scrapeDataForTicker = require("./scrapeDataForTicker")
const { scrapbookWriteOut, pause, writeFile } = require("./util")
const moment = require("moment")

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
  let badFetches = []
  const newStockData = {}

  const scrapeDataForTickers = async tickers => {
    console.log("Searching for tickers:", tickers)

    for (const ticker of tickers) {
      try {
        newStockData[ticker] = await scrapeDataForTicker(ticker, browser)
        console.log(`* TICKER COMPLETED OK: ${ticker}`)
      } catch (error) {
        console.log(`${ticker}: xxx FAIL xxx`, error)
        badFetches.push(ticker)
        newStockData[ticker] = { error }
      }
    }
  }

  await scrapeDataForTickers(allTickers)

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
