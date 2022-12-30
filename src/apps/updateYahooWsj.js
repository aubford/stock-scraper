const { chunk, fromPairs } = require("lodash")
const { yahoo, wsj } = require("../api")
const {
  getOnlyStockTickerData,
  scrapbookWriteOut,
  backupReturnStockDataFile,
} = require("../util")

const stockFile = backupReturnStockDataFile()
const stockData = getOnlyStockTickerData(stockFile)
const tickers = Object.keys(stockData)

const fetchData = async ticker => {
  const yahooData = await yahoo.fetch(ticker)
  const wsjData = await wsj.fetch(ticker)

  const { quoteSummary: { result } = {} } = yahooData
  if (result && wsjData) {
    console.log(`Fetched OK: ${ticker}`)
    return [ticker, { ...stockData[ticker], ...yahooData, ...wsjData }]
  }
  console.log(`*** FAILURE: ${ticker} ***`)
  return [ticker, stockData[ticker]]
}

const run = async () => {
  let res = []
  const tickerChunks = chunk(tickers, 8)
  for (const tickerChunk of tickerChunks) {
    const companyData = await Promise.stagger(fetchData, tickerChunk, 550)
    res = res.concat(companyData)
  }
  return res
}

run().then(companyData => {
  const updatedData = fromPairs(companyData)
  scrapbookWriteOut(updatedData)
  process.exit(0)
})
