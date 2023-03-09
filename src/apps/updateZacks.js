const { chunk, fromPairs } = require("lodash")
const { zacks } = require("../api")
const {
  getOnlyStockTickerData,
  scrapbookWriteOut,
  backupReturnStockDataFile,
} = require("../util")

const stockFile = backupReturnStockDataFile()
const stockData = getOnlyStockTickerData(stockFile)
const tickers = Object.keys(stockData)

const fetchData = async ticker => {
  const data = await zacks.fetch(ticker)

  if (data) {
    console.log(`Fetched OK: ${ticker}`)
    return [ticker, { ...stockData[ticker], ...data }]
  }
  console.log(`*** FAILURE: ${ticker} ***`)
  return [ticker, stockData[ticker]]
}

const run = async () => {
  let res = []
  const tickerChunks = chunk(tickers, 34)
  for (const tickerChunk of tickerChunks) {
    const companyData = await Promise.stagger(fetchData, tickerChunk, 20)
    res = res.concat(companyData)
  }
  return res
}

run().then(companyData => {
  const updatedData = fromPairs(companyData)
  scrapbookWriteOut(updatedData)
  process.exit(0)
})
