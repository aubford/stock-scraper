const { writeJsonFile, promptForTickers, getStockDataFile, readJsonFile } = require("../util")
const showTickers = require("./showTickers")

const main = async () => {
  const tickers = await promptForTickers()
  await deleteFromFile(tickers, STOCK_DATA_LOCATION)
  await deleteFromFile(tickers, STOCK_DATA_STAGING)

  console.log("New Tickers: ")
  showTickers()
}

const deleteFromFile = async (tickers, fileLocation) => {
  console.log("Delete from: ", fileLocation)
  const file = readJsonFile(fileLocation)

  Object.keys(file).forEach(ticker => {
    if (tickers.includes(ticker)) {
      delete file[ticker]
      console.log(`Deleted ${ticker}`)
    }
  })

  writeJsonFile(fileLocation, file)
}

module.exports = main
