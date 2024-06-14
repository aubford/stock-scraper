// check if any stocks in my csv are missing in stockData.json

const fs = require("fs")

// get file stockDataMeta.json
const stockDataMeta = JSON.parse(fs.readFileSync("./stockDataMeta.json"))

// get file stockData.json
const stockData = JSON.parse(fs.readFileSync("./stockData.json"))

// get myStocks from stockDataMeta
const myStocks = stockDataMeta.myStocks

// get stock tickers from myStocks
const stockTickers = Object.keys(myStocks)

const missingStocks = stockTickers.filter(ticker => !stockData[ticker])

if (missingStocks.length) {
  console.log("Missing stocks from stockData.json that exist in stockDataMeta.myStocks:", missingStocks)
  process.exit(1)
} else {
  console.log("No missing stocks")
}

process.exit(0)
