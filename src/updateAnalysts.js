const puppeteer = require("puppeteer-core")
const makeScrapeTools = require("./makeScrapeTools")
const {
  fetchFidelityAnalystOpinions,
  fetchFidelityKeyStats,
  fetchNewConstructs,
  fetchZacks,
  fetchTipData,
} = require("./api")
const {
  getFidelitySecretUrl,
  pauseExecution,
  scrapbookWriteOut,
  promptForTickers,
  promptUser,
  backupReturnStockDataFile,
} = require("./util")

/** @type {Object<function>} */
const analystMap = {
  [NEW_CONSTRUCTS]: fetchNewConstructs,
  [ZACKS]: fetchZacks,
  [FIDELITY_STATS]: fetchFidelityKeyStats,
  [FIDELITY]: fetchFidelityAnalystOpinions,
  [TIPRANKS]: fetchTipData,
}

const { magicTickers, buffetData, ...stockData } = backupReturnStockDataFile()

puppeteer.connect(CONNECTION).then(async browser => {
  const analyst = await promptUser("Analyst: ")
  const fetchAnalystData = analystMap[analyst]

  const promptResponse = await promptForTickers()
  const tickers = promptResponse ? promptResponse.split(/[^A-Z]/) : Object.keys(stockData)
  console.log("Searching for tickers:", tickers)

  for (const ticker of tickers) {
    await pauseExecution(ticker, tickers)

    let url
    if ([ZACKS, ARGUS_RESEARCH, ARGUS_ANALYST].includes(analyst)) {
      const link = stockData[ticker][analyst + "Link"]
      if (link) {
        url = await getFidelitySecretUrl(link, browser)
      }
    }

    const scrapeTools = makeScrapeTools(ticker, browser)
    const analystData = await fetchAnalystData(ticker, scrapeTools, url)

    stockData[ticker] = {
      ...stockData[ticker],
      ...analystData,
    }
  }

  scrapbookWriteOut({ ...stockData, magicTickers, buffetData })
})
