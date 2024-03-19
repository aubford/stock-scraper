const { chunk, fromPairs } = require("lodash")
const { wsj } = require("../sources")
const {
  scrapbookWriteOut,
  vooWriteOut,
  getStockTickers,
  getVooTickers,
  formatErrorObject,
  exit, promptUser,
} = require("../util")
const { connectAndRunApp } = require("../util/puppeteer-utils")

const IS_VOO = process.argv.includes("--voo")
const IS_SUBSET = process.argv.includes("--subset")

let tickers = IS_VOO ? getVooTickers() : getStockTickers()

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<Array>}
 */
const fetchStockData = async (ticker, browser) => {
  const wsjData = await wsj.fetch(ticker, browser)

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
const run = async browser => {
  if(IS_SUBSET) {
    const promptResponse = await promptUser('Tickers: ')
    tickers = promptResponse.split(/[^A-Z]/).filter(a => a)
  }
  
  console.log("Searching for tickers:", tickers)
  
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
  run(browser).then(companyData => {
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
