const puppeteer = require("puppeteer-core")
const makeScrapeTools = require("./makeScrapeTools")
const { fetchNewConstructs, fetchZacks } = require("./api")
const {
  getFidelitySecretUrl,
  pauseExecution,
  writeOut,
  promptForTickers,
  promptUser,
} = require("./util")

const analystMap = {
  [NEW_CONSTRUCTS]: fetchNewConstructs,
  [ZACKS]: fetchZacks,
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

    let url
    if ([ZACKS, ARGUS_RESEARCH, ARGUS_ANALYST].includes(analyst)) {
      const link = stockData[ticker][analyst + "Link"]
      if (link) {
        url = await getFidelitySecretUrl(link, browser)
      }
    }

    const analystData = await fetchAnalystData(ticker, fetchPdfData, url)

    stockData[ticker] = {
      ...stockData[ticker],
      ...analystData,
    }
  }

  writeOut({ ...stockData, magicTickers, buffetData })
})
