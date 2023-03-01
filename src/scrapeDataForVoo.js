const { yahoo, wsj, tipranks, fidelityAnalysts, moodys, zacks } = require("./api")
const { makePrettyDate, vooWriteOut, pause, newStockInfo } = require("./util")

const scrapeDataForTicker = async (ticker, browser) => {
  console.log(`* STARTING: ${ticker}`)

  const fidelityAnalystOpinionsData = await fidelityAnalysts.fetch(ticker, browser)

  const [moodysData, yahooData, yahooHistoricalPricesData, wsjData, zacksData, tipData] =
    await Promise.all([
      moodys.fetch(ticker, browser),
      yahoo.fetch(ticker),
      yahoo.fetchHistoricalPrices(ticker),
      wsj.fetch(ticker),
      zacks.fetch(ticker),
      tipranks.fetch(ticker, browser),
    ])

  return {
    scrapeDataUpdatedAt: Date.now(),
    updatedAt: makePrettyDate(),
    ticker,
    tickerSearch: `//${ticker}`,
    ...moodysData,
    ...fidelityAnalystOpinionsData,
    ...tipData,
    ...yahooData,
    ...wsjData,
    ...zacksData,
    ...yahooHistoricalPricesData,
    morganStanleyRating:
      tipData.tipMorganStanleyRating ||
      fidelityAnalystOpinionsData.fidelityMorganStanleyRecommendation,
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
        newStockData[ticker] = {
          error: true,
          errorMessage: error.message,
          errorStack: error.stack,
          ...newStockInfo(ticker),
          sector: "ERROR",
        }
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
  }

  vooWriteOut(newStockData, shouldMerge)
}
