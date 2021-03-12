const { fetchYahooData, fetchWSJData } = require("./api")
const buildCompanyData = require("./buildCompanyData")
const { writeOut, backupReturnStockDataFile } = require("./util")

const { magicTickers, buffetData, ...stockData } = backupReturnStockDataFile()
const tickers = Object.keys(stockData)

const fetchData = async ticker => {
  const yahooData = await fetchYahooData(ticker)
  const wsjData = await fetchWSJData(ticker)
  return [ticker, { ...buildCompanyData(yahooData, wsjData), ...stockData[ticker] }]
}

// NOTE: Is there an issue with fetchData being async??
Promise.all(tickers.map(fetchData)).then(companyData => {
  const updatedStockData = _.fromPairs(companyData)
  const updatedData = { magicTickers, buffetData, ...updatedStockData }
  writeOut(updatedData)
})
