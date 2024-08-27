const { fidelityAnalysts, argusAnalyst } = require("../sources")
const {
  stagingWriteOut,
  getStockDataFile,
  exit,
  ReError,
  getStockTickers,
} = require("../util")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

const stockData = getStockDataFile()
const tickers = getStockTickers(stockData)

const fetchTickerData = async (ticker, browser) => {
  const data = await fidelityAnalysts.fetch(ticker, browser)

  let argusData
  if (data.argusAnalystLink) {
    argusData = await argusAnalyst.fetch(ticker, browser, data.argusAnalystLink)
  }

  return {
    ...argusData,
    ...data,
  }
}

connectAndRunApp(async browser => {
  await beginAndLogin(browser, "Press Enter")

  const newData = {}
  for (const ticker of tickers) {
    try {
      newData[ticker] = await fetchTickerData(ticker, browser)
    } catch (err) {
      throw new ReError(`${ticker}: xxx TOP LEVEL FAIL xxx`, err,"")
    }
  }

  stagingWriteOut(newData, true)

  await exit()
})
