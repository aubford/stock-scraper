// noinspection ES6MissingAwait

const { chunk, fromPairs } = require("lodash")
const { yahoo, zacks, dataroma } = require("../sources")
const { union } = require("lodash")
const {
  getStockTickers,
  getVooTickers,
  formatErrorObject,
  exit,
  makePrettyDate,
  getEarningsPriceChange,
  promptForYes,
  stagingWriteOut,
  vooStagingWriteOut,
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
    const fetchPromises = [
      yahoo.fetch(ticker),
      yahoo.fetchHistoricalPrices(ticker),
      zacks.fetch(ticker),
    ]
    if (INCLUDE_DATAROMA) {
      fetchPromises.push(dataroma.fetch(ticker))
    }
    const [yahooData, prices, zacksData, dataromaData = {}] = await Promise.all(fetchPromises)

    const { yahooDailyPricesDates, yahooDailyPrices } = prices
    return [
      ticker,
      {
        ticker,
        dailyUpdateAt: makePrettyDate(),
        tickerSearch: `//${ticker}`,
        earningsPriceChange: getEarningsPriceChange(
          zacksData.zacksLastEarningsDate,
          yahooDailyPrices,
          yahooDailyPricesDates
        ),
        ...yahooData,
        ...zacksData,
        ...prices,
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

  vooStagingWriteOut(fromPairs(vooData), true)
  stagingWriteOut(fromPairs(stockData), true)

  await exit("Daily Update")
}

module.exports = app
