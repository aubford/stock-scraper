const puppeteer = require("puppeteer-core")
const makeScrapeTools = require("../makeScrapeTools")
const {
  fetchFidelityAnalystOpinions,
  fetchFidelityKeyStats,
  fetchNewConstructs,
  fetchZacks,
  fetchTipData,
} = require("../api")
const {
  getFidelitySecretUrl,
  scrapbookWriteOut,
  promptForTickers,
  promptUser,
  backupReturnStockDataFile,
  getOnlyStockTickerData,
} = require("../util")

/** @type {Object<function>} */
const analystMap = {
  [NEW_CONSTRUCTS]: fetchNewConstructs,
  [ZACKS]: fetchZacks,
  [FIDELITY_STATS]: fetchFidelityKeyStats,
  [FIDELITY]: fetchFidelityAnalystOpinions,
  [TIPRANKS]: fetchTipData,
}

const stockDataFile = backupReturnStockDataFile()
const stockData = getOnlyStockTickerData(stockDataFile)

puppeteer.connect(CONNECTION).then(async browser => {
  const analyst = await promptUser("Analyst: ")
  const fetchAnalystData = analystMap[analyst]

  const promptResponse = await promptForTickers()
  const tickers = promptResponse ? promptResponse.split(/[^A-Z]/) : Object.keys(stockData)
  console.log("Searching for tickers:", tickers)

  const newData = {}
  for (const ticker of tickers) {
    let url
    if ([ZACKS, ARGUS_RESEARCH, ARGUS_ANALYST].includes(analyst)) {
      const link = stockData[ticker][analyst + "Link"]
      if (link) {
        url = await getFidelitySecretUrl(link, browser, ticker)
      }
    }

    newData[ticker] = await fetchAnalystData(ticker, browser, url)
  }

  scrapbookWriteOut(newData, true)
  process.exit(0)
})
