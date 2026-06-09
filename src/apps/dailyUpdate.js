// noinspection ES6MissingAwait

const { chunk, fromPairs, union } = require("lodash")
const { yahoo, dataroma, marketBeat } = require("../sources")
const {
  getStockTickers,
  getVooTickers,
  formatErrorObject,
  exit,
  makePrettyDate,
  promptForYes,
  scrapbookWriteOut,
  vooWriteOut,
} = require("../util")

/**
 * @script dailyUpdate
 */

const app = async (isVoo, includeDataroma) => {
  console.log("🚀 Daily Update 🚀")
  const INCLUDE_DATAROMA = includeDataroma || (await promptForYes("Include Dataroma?"))

  const stockTickers = getStockTickers()
  const vooTickers = getVooTickers()
  const tickers = union(vooTickers, stockTickers)

  /**
   * @param {string} ticker
   * @returns {Promise<Array>}
   */
  const fetchStockData = async ticker => {
    const fetchPromises = [yahoo.fetchHistoricalPrices(ticker), marketBeat.fetch(ticker)]
    if (INCLUDE_DATAROMA) {
      fetchPromises.push(dataroma.fetch(ticker))
    }
    const [prices, marketBeatData, dataromaData = {}] = await Promise.all(fetchPromises)

    return [
      ticker,
      {
        ticker,
        dailyUpdateAt: makePrettyDate(),
        tickerSearch: `//${ticker}`,
        ...prices,
        ...marketBeatData,
        ...dataromaData,
      },
    ]
  }

  /**
   * @returns {Promise<Array<[string, Object]>>}
   */
  const runDailyUpdate = async () => {
    await yahoo.fetchVooIndexHistoricalPrices()

    const handleFetchTicker = async ticker => {
      console.log(`* STARTING: ${ticker}`)
      try {
        const res = await fetchStockData(ticker)
        console.log(`* TICKER COMPLETED: ${ticker}`)
        return res
      } catch (error) {
        console.error(`${ticker}: xxx Uncaught Error! xxx`, error)
        return formatErrorObject(error, ticker, true)
      }
    }

    let res = []
    const tickerChunks = chunk(tickers, 3)
    for (const tickerChunk of tickerChunks) {
      const companyData = await Promise.stagger(handleFetchTicker, tickerChunk, 500)
      res = res.concat(companyData)
    }
    return res
  }

  const companyData = await runDailyUpdate()

  const vooData = companyData.filter(([ticker]) => vooTickers.includes(ticker))
  const stockData = companyData.filter(([ticker]) => stockTickers.includes(ticker))

  vooWriteOut(fromPairs(vooData), true)
  scrapbookWriteOut(fromPairs(stockData), true)

  await exit("Daily Update")
}

module.exports = app
