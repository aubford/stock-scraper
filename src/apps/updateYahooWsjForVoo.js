const { chunk, fromPairs } = require("lodash")
const { yahoo, wsj } = require("../api")
const { vooWriteOut } = require("../util")

const tickers = require("../vooTickers")

const fetchData = async ticker => {
  const yahooData = await yahoo.fetch(ticker)
  const historicalPrices = await yahoo.fetchHistoricalPrices(ticker)
  const wsjData = await wsj.fetch(ticker)

  if (yahooData && wsjData) {
    console.log(`Fetched OK: ${ticker}`)
    return [ticker, { ...yahooData, ...wsjData, ...historicalPrices }]
  }
  console.log(`*** FAILURE: ${ticker} ***`)
}

const run = async () => {
  let res = []

  const tickerChunks = chunk(tickers, 8)
  for (const tickerChunk of tickerChunks) {
    const companyData = await Promise.stagger(fetchData, tickerChunk, 350)
    if (companyData) {
      res = res.concat(companyData)
    }
  }

  return res
}

run().then(companyData => {
  const updatedData = fromPairs(companyData)
  vooWriteOut(updatedData, true)
  process.exit(0)
})
