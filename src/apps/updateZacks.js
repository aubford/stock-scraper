const { chunk, fromPairs } = require("lodash")
const { zacks } = require("../sources")
const { stagingWriteOut, getStockDataFile } = require("../util")

const stockData = getStockDataFile()
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
  const tickerChunks = chunk(tickers, 20)
  for (const tickerChunk of tickerChunks) {
    const companyData = await Promise.stagger(fetchData, tickerChunk, 35)
    res = res.concat(companyData)
  }
  return res
}

module.exports = () =>
  run().then(companyData => {
    const updatedData = fromPairs(companyData)
    stagingWriteOut(updatedData, true)
  })
