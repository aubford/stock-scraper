const _ = require("lodash")
const fs = require("fs")
const readline = require("readline")

const SCRAPBOOK_LOCATION = "/Users/aubrey/Google Drive/stock-scrapbook"
const stockDataLocation = `${SCRAPBOOK_LOCATION}/stockData.json`



const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const promptForTickers = () => new Promise(resolve => {
  readlineInterface.question("Tickers: ", tickers => {
    resolve(tickers)
    readlineInterface.close()
  })
})

const run = async () => {
  const promptResponse = await promptForTickers()
  const tickers = promptResponse.split(/[^A-Z]/)
  
  console.log(tickers)
  process.exit(0)
}

run()
