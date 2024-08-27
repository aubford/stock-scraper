const { chunk, fromPairs } = require("lodash")
const { yahoo, zacks, dataroma } = require("../sources")
const {
  scrapbookWriteOut,
  vooWriteOut,
  getStockTickers,
  getVooTickers,
  formatErrorObject,
  exit,
  makePrettyDate,
  getEarningsPriceChange,
  promptForYes,
} = require("../util")

/**
 * @script dailyUpdate
 */

const app = async () => {
  const IS_VOO = await promptForYes("Is VOO?")
  const INCLUDE_DATAROMA = await promptForYes("Include Dataroma?")

  const tickers = IS_VOO ? getVooTickers() : getStockTickers()

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
   * @returns {Promise<*[]>}
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

  runDailyUpdate().then(companyData => {
    const updatedData = fromPairs(companyData)

    // Check if the '--voo' flag was passed
    if (IS_VOO) {
      vooWriteOut(updatedData, true)
    } else {
      scrapbookWriteOut(updatedData, true)
    }

    exit()
  })
}

app()
