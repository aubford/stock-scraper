const { morningstar, cfra, boa } = require("../sources")
const { stagingWriteOut, getStockDataFile, exit, getStockTickers } = require("../util")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

const stockData = getStockDataFile()
const tickers = getStockTickers(stockData)

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

connectAndRunApp(async browser => {
  await beginAndLogin(browser, "Press Enter")

  const newData = {}
  for (const ticker of tickers) {
    try {
      newData[ticker] = await fetchTickerData(ticker, browser)
    } catch (err) {
      console.log(`${ticker}: xxx TOP LEVEL FAIL xxx`, err)
    }
  }

  stagingWriteOut(newData, true)

  await exit()
})
