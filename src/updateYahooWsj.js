const { fromPairs } = require("lodash")
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
  const res = []
  for (const ticker of tickers) {
    const companyData = await fetchData(ticker)
    res.push(companyData)
  }
  return res
}

// todo: could chunk if we need it faster...
run().then(companyData => {
  const updatedData = fromPairs(companyData)
  scrapbookWriteOut(updatedData)
  process.exit(0)
})
