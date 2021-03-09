const { fetchYahooData, fetchWSJData } = require("./api")
const buildCompanyData = require("./buildCompanyData")

fs.copyFileSync(STOCK_DATA_LOCATION, STOCK_DATA_BACKUP_LOCATION)

/** @type {*} */
const stockDataFile = fs.readFileSync(STOCK_DATA_LOCATION)
const { magicTickers, buffetData, ...stockData } = JSON.parse(stockDataFile)

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
  console.log(updatedData)
  //fs.writeFile(stockDataLocation, JSON.stringify(updatedData), err => {
  //  console.log("** COMPLETE, WRITING TO FILE **")
  //  if (err) {
  //    console.log("File Write Error: " + err)
  //  }
  //  process.exit(0)
  //})
})
