const { chunk, fromPairs, union } = require("lodash")
const { yahoo, dataroma, marketBeat } = require("../sources")
const {
  getStockTickers,
  getVooTickers,
  exit,
  makePrettyDate,
  promptForYes,
  scrapbookWriteOut,
  vooWriteOut,
} = require("../util")

/**
 * @param {Object} data
 * @returns {boolean}
 */
const hasSourceError = data =>
  Boolean(
    data?.error ||
      data?.duError ||
      Object.keys(data || {}).some(key => key.startsWith("error_")),
  )

/**
 * @script dailyUpdate
 */

const app = async () => {
  console.log("🚀 Daily Update 🚀")
  const INCLUDE_DATAROMA = await promptForYes("Include Dataroma?")

  const stockTickers = getStockTickers()
  const vooTickers = getVooTickers()
  const tickers = union(vooTickers, stockTickers)

  /**
   * @param {string} ticker
   * @returns {Promise<[string, Object] | null>}
   */
  const fetchStockData = async ticker => {
    const fetchPromises = [yahoo.fetchHistoricalPrices(ticker), marketBeat.fetch(ticker)]
    if (INCLUDE_DATAROMA) {
      fetchPromises.push(dataroma.fetch(ticker))
    }
    const [prices, marketBeatData, dataromaData = {}] = await Promise.all(fetchPromises)
    const payload = { ...prices, ...marketBeatData, ...dataromaData }

    if (hasSourceError(payload)) {
      return null
    }

    return [
      ticker,
      {
        ticker,
        dailyUpdateAt: makePrettyDate(),
        tickerSearch: `//${ticker}`,
        ...payload,
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
        if (!res) {
          console.error(`${ticker}: xxx Fetch error, skipping write xxx`)
          return null
        }
        console.log(`* TICKER COMPLETED: ${ticker}`)
        return res
      } catch (error) {
        console.error(`${ticker}: xxx Uncaught Error, skipping write xxx`, error)
        return null
      }
    }

    let res = []
    const tickerChunks = chunk(tickers, 3)
    for (const tickerChunk of tickerChunks) {
      const companyData = await Promise.stagger(handleFetchTicker, tickerChunk, 500)
      res = res.concat(companyData.filter(Boolean))
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
