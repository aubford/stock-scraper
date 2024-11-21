const { getStockTickers, promptForTickers, warnMissingCsvStockTickers } = require("../util")

module.exports = async () => {
  console.log("Provide tickers from spreadsheet")  
  const tickers = await promptForTickers()
  const stockTickers = getStockTickers()
  console.log("Missing from stockData: ")
  console.log(tickers.filter(ticker => !stockTickers.includes(ticker) && !NO_FETCH_STOCKS.includes(ticker)))
  console.log("Missing from spreadsheet: ")
  console.log(stockTickers.filter(ticker => !tickers.includes(ticker)))
  warnMissingCsvStockTickers(tickers, stockTickers)
}
