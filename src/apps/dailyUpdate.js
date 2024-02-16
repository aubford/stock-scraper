const { chunk, fromPairs } = require("lodash")
const { yahoo, zacks } = require("../sources")
const {
  scrapbookWriteOut,
  vooWriteOut,
  getStockTickers,
  getVooTickers,
  formatErrorObject,
  exit,
  makePrettyDate,
  getEarningsPriceChange,
} = require("../util")

const IS_VOO = process.argv.includes("--voo")

const tickers = IS_VOO ? getVooTickers() : getStockTickers()

/**
 * @script dailyUpdate
 */

/**
 * @param {string} ticker
 * @returns {Promise<Array>}
 */
const fetchStockData = async ticker => {
  const [yahooData, prices, zacksData] = await Promise.all([
    yahoo.fetch(ticker),
    yahoo.fetchHistoricalPrices(ticker),
    zacks.fetch(ticker),
  ])

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
      console.log(`* TICKER COMPLETED OK: ${ticker}`)
      return res
    } catch (error) {
      console.error(`${ticker}: xxx SCRIPT IS BROKEN! xxx`, error)
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
