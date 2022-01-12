const { chunk, fromPairs } = require("lodash")
const { fetchYahooData, fetchWSJData } = require("../api")
const buildCompanyData = require("../buildCompanyData")
const { vooWriteOut } = require("../util")

const tickers = require("../vooTickers")

const fetchData = async ticker => {
  const yahooData = await fetchYahooData(ticker)
  const wsjData = await fetchWSJData(ticker)

  const { quoteSummary: { result } = {} } = yahooData
  if (result && wsjData) {
    console.log(`Fetched OK: ${ticker}`)
    return [ticker, buildCompanyData(yahooData, wsjData)]
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
