const { getStockTickers, promptForTickers } = require("../util")

module.exports = async () => {
  const tickers = await promptForTickers()
  const stockTickers = getStockTickers()
  console.log("Missing from stockData: ")
  console.log(tickers.filter(ticker => !stockTickers.includes(ticker)))
  console.log("Missing from spreadsheet: ")
  console.log(stockTickers.filter(ticker => !tickers.includes(ticker)))
}
