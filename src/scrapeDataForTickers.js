const scrapeDataForTicker = require("./scrapeDataForTicker")
const { stagingWriteOut, formatErrorObject } = require("./util")
const { yahoo } = require("./sources")

/**
 * @typedef {{ ticker: string, ok: boolean, data?: Object, error?: Error }} ScrapeResult
 */

/**
 * @param {string[]} tickers
 * @param {Browser} browser
 * @returns {Promise<ScrapeResult[]>}
 */
module.exports = async (tickers, browser) => {
  await yahoo.fetchVooIndexHistoricalPrices()
  console.log("Searching for tickers:", tickers)

  const results = []
  for (const ticker of tickers) {
    try {
      const stockData = await scrapeDataForTicker(ticker, browser)
      stagingWriteOut({ [stockData.ticker]: stockData })
      console.log(`🎉 SCRAPE SUCCESS: ${ticker} 🎉`)
      results.push({ ticker, ok: true, data: stockData })
    } catch (error) {
      console.error("🚨🚨🚨 SCRAPE FAIL 🚨🚨🚨", error)
      stagingWriteOut({ ticker: formatErrorObject(error, ticker) })
      results.push({ ticker, ok: false, error })
    }
  }
  return results
}
