const { fromPairs } = require("lodash")
const { fetchYahooData, fetchWSJData } = require("./api")
const buildCompanyData = require("./buildCompanyData")
const { scrapbookWriteOut, backupReturnStockDataFile } = require("./util")

const { magicTickers, buffetData, ...stockData } = backupReturnStockDataFile()
const tickers = Object.keys(stockData)

const fetchData = async ticker => {
  console.log(`*** Fetching data for: ${ticker} ***`)

  const yahooData = await fetchYahooData(ticker)
  const wsjData = await fetchWSJData(ticker)

  const { quoteSummary: { result } = {} } = yahooData
  if (result && wsjData) {
    return [ticker, { ...stockData[ticker], ...buildCompanyData(yahooData, wsjData) }]
  }
  return [ticker, stockData[ticker]]
}

// NOTE: Is there an issue with fetchData being async??
Promise.all(tickers.map(fetchData)).then(companyData => {
  const updatedStockData = fromPairs(companyData)
  const updatedData = { magicTickers, buffetData, ...updatedStockData }
  scrapbookWriteOut(updatedData)
  process.exit(0)
})
