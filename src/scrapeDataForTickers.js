const scrapeDataForTicker = require("./scrapeDataForTicker")
const { stagingWriteOut, formatErrorObject } = require("./util")
const { yahoo } = require("./sources")


module.exports = async (tickers, browser) => {
  await yahoo.fetchVooIndexHistoricalPrices()
  console.log("Searching for tickers:", tickers)

  for (const ticker of tickers) {
    try {
      const stockData = await scrapeDataForTicker(ticker, browser)
      stagingWriteOut({ ticker: stockData })
      console.log(`🎉 SCRAPE SUCCESS: ${ticker} 🎉`)
    } catch (error) {
      console.error("🚨🚨🚨 SCRAPE FAIL 🚨🚨🚨", error)
      stagingWriteOut({ ticker: formatErrorObject(error, ticker) })
    }
  }
}
