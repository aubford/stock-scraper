const scrapeDataForTicker = require("./scrapeDataForTicker")
const {
  stagingWriteOut,
  formatErrorObject,
  readJsonFile,
  getStockDataFile,
} = require("./util")
const { yahoo, dataroma } = require("./sources")

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

  const previousData = [readJsonFile(STOCK_DATA_STAGING), getStockDataFile()]
  const results = []
  for (const ticker of tickers) {
    try {
      const previousRecord = dataroma.findPreviousRecord(ticker, previousData)
      const stockData = await scrapeDataForTicker(ticker, browser, previousRecord)
      stagingWriteOut({ [stockData.ticker]: stockData })
      console.log(`🎉 SCRAPE SUCCESS: ${ticker} 🎉`)
      results.push({ ticker, ok: true, data: stockData })
    } catch (error) {
      console.error("🚨🚨🚨 SCRAPE FAIL 🚨🚨🚨", error)
      stagingWriteOut({ [ticker]: formatErrorObject(error, ticker) })
      results.push({ ticker, ok: false, error })
    }
  }
  return results
}
