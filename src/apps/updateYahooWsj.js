const { chunk, fromPairs } = require("lodash")
const { yahoo, wsj } = require("../api")
const { getOnlyStockTickerData, scrapbookWriteOut, getStockDataFile } = require("../util")

const stockFile = getStockDataFile()
const stockData = getOnlyStockTickerData(stockFile)
const tickers = Object.keys(stockData)

const fetchData = async ticker => {
  const [yahooData, historicalPrices, wsjData] = await Promise.all([
    yahoo.fetch(ticker),
    yahoo.fetchHistoricalPrices(ticker),
    wsj.fetch(ticker),
  ])

  if (yahooData && wsjData) {
    console.log(`Fetched OK: ${ticker}`)
    return [ticker, { ...stockData[ticker], ...yahooData, ...wsjData, ...historicalPrices }]
  }
  console.log(`*** FAILURE: ${ticker} ***`)
  return [ticker, stockData[ticker]]
}

const run = async () => {
  let res = []
  const tickerChunks = chunk(tickers, 8)
  for (const tickerChunk of tickerChunks) {
    const companyData = await Promise.stagger(fetchData, tickerChunk, 600)
    res = res.concat(companyData)
  }
  return res
}

run().then(companyData => {
  const updatedData = fromPairs(companyData)
  scrapbookWriteOut(updatedData)
  process.exit(0)
})
