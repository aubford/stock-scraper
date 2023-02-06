const { yahoo, wsj, tipranks, fidelityAnalysts, moodys } = require("./api")
const { makePrettyDate, vooWriteOut, pause } = require("./util")

const scrapeDataForTicker = async (ticker, browser) => {
  console.log(`* STARTING: ${ticker}`)

  const fidelityAnalystOpinionsData = await fidelityAnalysts.fetch(ticker, browser)

  const [[moodysRating, moodysOutlook, moodysLink], yahooData, wsjData] = await Promise.all([
    moodys.fetch(ticker, browser),
    yahoo.fetch(ticker),
    wsj.fetch(ticker),
  ])

  const tipData = await tipranks.fetch(ticker, browser)

  return {
    scrapeDataUpdatedAt: Date.now(),
    updatedAt: makePrettyDate(),
    moodysLink: moodysLink || "",
    moodysOutlook,
    moodysRating,
    ticker,
    tickerSearch: `//${ticker}`,
    ...fidelityAnalystOpinionsData,
    ...tipData,
    ...yahooData,
    ...wsjData,
  }
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
  }

  vooWriteOut(newStockData, shouldMerge)
}
