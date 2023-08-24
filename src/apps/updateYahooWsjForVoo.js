const { chunk, fromPairs } = require("lodash")
const { yahoo, wsj } = require("../api")
const { vooWriteOut } = require("../util")

const tickers = require("../database/vooTickers")

const fetchData = async ticker => {
  const [yahooData, historicalPrices, wsjData] = await Promise.all([
    yahoo.fetch(ticker),
    yahoo.fetchHistoricalPrices(ticker),
    wsj.fetch(ticker),
  ])

  if (yahooData && wsjData) {
    console.log(`Fetched OK: ${ticker}`)
    return [ticker, { ...yahooData, ...wsjData, ...historicalPrices }]
  }
  console.log(`*** FAILURE: ${ticker} ***`)
}

const run = async () => {
  await yahoo.fetchVooIndexHistoricalPrices()
  let res = []

  const tickerChunks = chunk(tickers, 8)
  for (const tickerChunk of tickerChunks) {
    const companyData = await Promise.stagger(fetchData, tickerChunk, 600)
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
