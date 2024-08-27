const { chunk, fromPairs } = require("lodash")
const { wsj } = require("../sources")
const {
  stagingWriteOut,
  vooStagingWriteOut,
  getStockTickers,
  getVooTickers,
  formatErrorObject,
  exit,
  promptUser,
  promptForYes,
} = require("../util")
const { connectAndRunApp } = require("../util/puppeteer-utils")

const app = async browser => {
  const IS_VOO = await promptForYes("VOO?")
  const IS_SUBSET = await promptForYes("Subset?")
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
    if (IS_SUBSET) {
      const promptResponse = await promptUser("Tickers: ")
      tickers = promptResponse.split(/[^A-Z]/).filter(a => a)
    }

    console.log("Searching for tickers:", tickers)

    const handleFetchTicker = async ticker => {
      console.log(`* STARTING: ${ticker}`)
      try {
        const res = await fetchStockData(ticker, browser)
        console.log(`* TICKER COMPLETED OK: ${ticker}\n`)
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

  run(browser).then(companyData => {
    const updatedData = fromPairs(companyData)

    // Check if the '--voo' flag was passed
    if (IS_VOO) {
      vooStagingWriteOut(updatedData, true)
    } else {
      stagingWriteOut(updatedData, true)
    }

    exit()
  })
}

connectAndRunApp(app)
