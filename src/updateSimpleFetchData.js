const _ = require("lodash")
const fs = require("fs")
const { SCRAPBOOK_LOCATION } = require("./util")
const { fetchYahooData, fetchWSJData } = require("./api")
const buildCompanyData = require("./buildCompanyData")

const stockDataLocation = `${SCRAPBOOK_LOCATION}/stockData.json`
const stockDataBackupLocation = `${SCRAPBOOK_LOCATION}/stockDataBackup.json`

fs.copyFileSync(stockDataLocation, stockDataBackupLocation)

/** @type {*} */
const stockDataFile = fs.readFileSync(stockDataLocation)
const { magicTickers, buffetData, ...stockData } = JSON.parse(stockDataFile)

const tickers = Object.keys(stockData)

const fetchData = async ticker => {
  const yahooData = await fetchYahooData(ticker)
  const wsjData = await fetchWSJData(ticker)
  return [ticker, { ...buildCompanyData(yahooData, wsjData), ...stockData[ticker] }]
}

Promise.all(tickers.map(fetchData)).then(companyData => {
  const updatedStockData = _.fromPairs(companyData)
  const updatedData = { magicTickers, buffetData, ...updatedStockData }
  fs.writeFile(stockDataLocation, JSON.stringify(updatedData), err => {
    console.log("** COMPLETE, WRITING TO FILE **")
    if (err) {
      console.log("File Write Error: " + err)
    }
    process.exit(0)
  })
})
