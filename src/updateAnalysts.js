const puppeteer = require("puppeteer-core")
const makeScrapeTools = require("./makeScrapeTools")
const { fetchNewConstructs } = require("./api")
const { pauseExecution, writeOut, promptForTickers, promptUser } = require("./util")

const analystMap = {
  nc: fetchNewConstructs,
}

fs.copyFileSync(STOCK_DATA_LOCATION, STOCK_DATA_BACKUP_LOCATION)

/** @type {*} */
const stockDataFile = fs.readFileSync(STOCK_DATA_LOCATION)
const { magicTickers, buffetData, ...stockData } = JSON.parse(stockDataFile)

puppeteer.connect(CONNECTION).then(async browser => {
  const analyst = await promptUser("Analyst: ")
  const fetchAnalystData = analystMap[analyst]

  const promptResponse = await promptForTickers()
  const tickers = promptResponse ? promptResponse.split(/[^A-Z]/) : Object.keys(stockData)
  console.log("Searching for tickers:", tickers)

  for (const ticker of tickers) {
    const { fetchPdfData } = makeScrapeTools(ticker, browser)

    await pauseExecution(ticker, tickers)

    const analystData = await fetchAnalystData(ticker, fetchPdfData)

    stockData[ticker] = {
      ...stockData[ticker],
      ...analystData,
    }
  }

  writeOut({ ...stockData, magicTickers, buffetData })
})
