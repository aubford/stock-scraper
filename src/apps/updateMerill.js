const puppeteer = require("puppeteer-core")
const { morningstar, cfra, boa } = require("../api")
const {
  scrapbookWriteOut,
  promptUser,
  getStockDataFile,
  getOnlyStockTickerData,
  exit,
  begin,
  promptLogin,
} = require("../util")
const { getTickers } = require("../database/introspectStockData")
const { goToNewBrowserPage } = require("../puppeteer")

const stockDataFile = getStockDataFile()
const stockData = getOnlyStockTickerData(stockDataFile)
const tickers = getTickers(stockData)

const fetchTickerData = async (ticker, browser) => {
  const {
    boaRating,
    boaVolatility,
    boaIncome,
    boaInvestment,
    morningstarRating,
    morningstarLink,
    cfraRating,
    cfraLink,
  } = await boa.fetch(ticker, browser)

  if (!morningstarRating && !cfraRating) {
    return {
      boaRating,
      boaVolatility,
      boaIncome,
      boaInvestment,
      morningstarRating: "none",
      morningstarLink,
      cfraRating: "none",
      cfraLink,
    }
  }

  const [morningstarData, cfraData] = await Promise.all([
    morningstar.fetch(ticker, morningstarLink, browser),
    cfra.fetch(ticker, cfraRating, cfraLink, browser),
  ])

  return {
    ...morningstarData,
    ...cfraData,
    boaRating,
    boaVolatility,
    boaIncome,
    boaInvestment,
  }
}

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    begin()

    const closeLoginPages = await promptLogin((url, options) =>
      goToNewBrowserPage(browser, url, options)
    )
    await promptUser("Hit Enter:")
    closeLoginPages()

    const newData = {}
    for (const ticker of tickers) {
      try {
        newData[ticker] = await fetchTickerData(ticker, browser)
      } catch (err) {
        console.log(`${ticker}: xxx TOP LEVEL FAIL xxx`, err)
      }
    }

    scrapbookWriteOut(newData, true)

    exit()
  })
  .catch(err => console.error(err))
