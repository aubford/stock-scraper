const { fidelityAnalysts, argusAnalyst } = require("../sources")
const { scrapbookWriteOut, getStockDataFile, exit, ReError} = require("../util")
const { getTickers } = require("../database/introspectStockData")
const { beginAndLogin, connectAndRunApp } = require("../puppeteer-utils")

const stockData = getStockDataFile()
const tickers = getTickers(stockData)

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
      throw new ReError(`${ticker}: xxx TOP LEVEL FAIL xxx`, err)
    }
  }

  scrapbookWriteOut(newData, true)

  await exit()
})
