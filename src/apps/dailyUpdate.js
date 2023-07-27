const { chunk, fromPairs } = require("lodash")
const { yahoo, zacks, wsj } = require("../api")
const { scrapbookWriteOut, getStockTickers, getStockData } = require("../util")

const stockData = getStockData()
const tickers = getStockTickers()

const fetchData = async ticker => {
  const prices = await yahoo.fetchHistoricalPrices(ticker)
  const yahooData = await yahoo.fetch(ticker)
  const zacksData = await zacks.fetch(ticker)
  const wsjData = await wsj.fetch(ticker)

  if (prices && zacksData && wsjData && yahooData) {
    console.log(`Fetched OK: ${ticker}`)
    return [
      ticker,
      { ...stockData[ticker], ...prices, ...zacksData, ...wsjData, ...yahooData },
    ]
  }
  console.log(`*** FAILURE: ${ticker} ***`)
  return [ticker, stockData[ticker]]
}

const run = async () => {
  await yahoo.fetchVooIndexHistoricalPrices()

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
