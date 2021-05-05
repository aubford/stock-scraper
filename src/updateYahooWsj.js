const { chunk, fromPairs } = require("lodash")
const { fetchYahooData, fetchWSJData } = require("./api")
const buildCompanyData = require("./buildCompanyData")
const {
  getOnlyStockTickerData,
  scrapbookWriteOut,
  backupReturnStockDataFile,
} = require("./util")

const stockFile = backupReturnStockDataFile()
const stockData = getOnlyStockTickerData(stockFile)
const tickers = Object.keys(stockData)

const fetchData = async ticker => {
  const yahooData = await fetchYahooData(ticker)
  const wsjData = await fetchWSJData(ticker)

  const { quoteSummary: { result } = {} } = yahooData
  if (result && wsjData) {
    console.log(`Fetched OK: ${ticker}`)
    return [ticker, { ...stockData[ticker], ...buildCompanyData(yahooData, wsjData) }]
  }
  console.log(`*** FAILURE: ${ticker} ***`)
  return [ticker, stockData[ticker]]
}

const run = async () => {
  let res = []
  const tickerChunks = chunk(tickers, 15)
  for (const chunk of tickerChunks) {
    const companyData = await Promise.all(chunk.map(fetchData))
    res = res.concat(companyData)
  }
  return res
}

run().then(companyData => {
  const updatedData = fromPairs(companyData)
  scrapbookWriteOut(updatedData)
  process.exit(0)
})
