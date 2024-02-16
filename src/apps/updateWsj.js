const { chunk, fromPairs } = require("lodash")
const { wsj } = require("../sources")
const {
  scrapbookWriteOut,
  vooWriteOut,
  getStockTickers,
  getVooTickers,
  formatErrorObject,
  exit,
} = require("../util")
const { connectAndRunApp } = require("../puppeteer-utils")

const IS_VOO = process.argv.includes("--voo")

const tickers = IS_VOO ? getVooTickers() : getStockTickers()

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<Array>}
 */
const fetchStockData = async (ticker, browser) => {
  const wsjData = wsj.fetch(ticker, browser)

  return [
    ticker,
    {
      ticker,
      ...wsjData,
    },
  ]
}

/**
 * @param {Browser} browser
 * @returns {Promise<*[]>}
 */
const runDailyUpdate = async browser => {
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
  const tickerChunks = chunk(tickers, 3)
  for (const tickerChunk of tickerChunks) {
    const companyData = await Promise.stagger(handleFetchTicker, tickerChunk, 2000)
    res = res.concat(companyData)
  }
  return res
}

connectAndRunApp(browser =>
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
)
