const { morningstar } = require("../sources")
const {
  stagingWriteOut,
  vooStagingWriteOut,
  getStockTickers,
  getVooTickers,
  getStockDataFile,
  readJsonFile,
  formatErrorObject,
  exit,
  promptUser,
  promptForYes,
} = require("../util")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

/**
 * @param {string} ticker
 * @param {string} morningstarLink
 * @param {Browser} browser
 * @returns {Promise<object>}
 */
const fetchTickerData = async (ticker, morningstarLink, browser) => {
  if (!morningstarLink) {
    console.log(`${ticker}: no morningstarLink`)
    return { ticker }
  }

  const morningstarData = await morningstar.fetch(ticker, morningstarLink, browser)
  return { ticker, ...morningstarData }
}

module.exports = () =>
  connectAndRunApp(async browser => {
    const isVoo = await promptForYes("VOO?")
    const isSubset = await promptForYes("Subset?")

    const sourceData = isVoo ? readJsonFile(VOO_LOCATION) : getStockDataFile()
    let tickers = isVoo ? getVooTickers() : getStockTickers()

    if (isSubset) {
      const promptResponse = await promptUser("Tickers: ")
      tickers = promptResponse.split(/[^A-Z]/).filter(Boolean)
    }

    await beginAndLogin(browser, "Press Enter")

    const writeOut = isVoo ? vooStagingWriteOut : stagingWriteOut
    console.log("Searching for tickers:", tickers)

    for (const ticker of tickers) {
      console.log(`* STARTING: ${ticker}`)
      try {
        const morningstarLink = sourceData[ticker]?.morningstarLink
        const data = await fetchTickerData(ticker, morningstarLink, browser)
        writeOut({ [ticker]: data }, true)
        console.log(`* TICKER COMPLETED OK: ${ticker}\n`)
      } catch (error) {
        console.error(`${ticker}: xxx SCRIPT IS BROKEN! xxx`, error)
        writeOut({ [ticker]: formatErrorObject(error, ticker) }, true)
      }
    }

    await exit("updateMorningstar")
  })
