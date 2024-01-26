const { chunk, fromPairs } = require("lodash")
const { yahoo, zacks, wsj } = require("../sources")
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
const { connectAndRunApp } = require("../puppeteer-utils")

const IS_VOO = process.argv.includes("--voo")

const tickers = IS_VOO ? getVooTickers() : getStockTickers()

/**
 * @script dailyUpdate
 */

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<Array>}
 */
const fetchStockData = async (ticker, browser) => {
  const [yahooData, prices, wsjData, zacksData] = await Promise.all([
    yahoo.fetch(ticker),
    yahoo.fetchHistoricalPrices(ticker),
    wsj.fetch(ticker, browser),
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
      ...wsjData,
      ...zacksData,
      ...prices,
    },
  ]
}

/**
 * @param {Browser} browser
 * @returns {Promise<*[]>}
 */
const runDailyUpdate = async browser => {
  await yahoo.fetchVooIndexHistoricalPrices()

  const handleFetchTicker = async ticker => {
    console.log(`* STARTING: ${ticker}`)
    try {
      const res = await fetchStockData(ticker, browser)
      console.log(`* TICKER COMPLETED OK: ${ticker}`)
      return res
    } catch (error) {
      console.error(`${ticker}: xxx SCRIPT IS BROKEN! xxx`, error)
      return formatErrorObject(error, ticker, true)
    }
  }

  let res = []
  const tickerChunks = chunk(tickers, 8)
  for (const tickerChunk of tickerChunks) {
    const companyData = await Promise.stagger(handleFetchTicker, tickerChunk, 550)
    res = res.concat(companyData)
  }
  return res
}

connectAndRunApp(async browser => {
  runDailyUpdate(browser).then(companyData => {
    const updatedData = fromPairs(companyData)

    // Check if the '--voo' flag was passed
    if (IS_VOO) {
      vooWriteOut(updatedData, true)
    } else {
      scrapbookWriteOut(updatedData, true)
    }

    exit()
  })
})
