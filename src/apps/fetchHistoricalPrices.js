const { chunk, fromPairs } = require("lodash")
const { yahoo, wsj } = require("../api")
const {
  getOnlyStockTickerData,
  scrapbookWriteOut,
  backupReturnStockDataFile,
  promptForTickers,
} = require("../util")

const stockFile = backupReturnStockDataFile()
const stockData = getOnlyStockTickerData(stockFile)

const fetchData = async ticker => {
  const data = await yahoo.fetchHistoricalPrices(ticker)

  if (data) {
    console.log(`Fetched OK: ${ticker}`)
    return [ticker, { ...stockData[ticker], ...data }]
  }
  console.log(`*** FAILURE: ${ticker} ***`)
  return [ticker, stockData[ticker]]
}

const run = async () => {
  const promptResponse = await promptForTickers()
  const tickers = promptResponse
    ? promptResponse.split(/[^A-Z]/).filter(a => a)
    : Object.keys(getOnlyStockTickerData(backupReturnStockDataFile()))

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
