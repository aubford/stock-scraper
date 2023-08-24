const { chunk, fromPairs } = require("lodash")
const { zacks } = require("../api")
const { vooWriteOut } = require("../util")

const tickers = require("../database/vooTickers")

const fetchData = async ticker => {
  const data = await zacks.fetch(ticker)

  if (data) {
    console.log(`Fetched OK: ${ticker}`)
    return [ticker, data]
  }
  console.log(`*** FAILURE: ${ticker} ***`)
}

const run = async () => {
  let res = []

  const tickerChunks = chunk(tickers, 40)
  for (const tickerChunk of tickerChunks) {
    const companyData = await Promise.stagger(fetchData, tickerChunk, 20)
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
