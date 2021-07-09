const puppeteer = require("puppeteer-core")
const {
  newBrowserPage,
  scrapbookWriteOut,
  promptForTickers,
  promptLogin,
  backupReturnStockDataFile,
  promptForPause,
  getOnlyStockTickerData,
} = require("./util")
const scrapeDataForTickers = require("./scrapeDataForTickers")

puppeteer.connect(CONNECTION).then(async browser => {
  await promptForPause()

  const newPage = (url, options) => newBrowserPage(browser, url, options)
  const closeLoginPages = await promptLogin(newPage)

  const promptResponse = await promptForTickers()

  console.warn("********  Turn on PDF Viewer extension!!!! ********")

  const tickers = promptResponse
    ? promptResponse.split(/[^A-Z]/).filter(a => a)
    : Object.keys(getOnlyStockTickerData(backupReturnStockDataFile()))

  closeLoginPages()

  const newStockData = await scrapeDataForTickers(tickers, browser)
  newStockData.wsjShortDate

  scrapbookWriteOut(newStockData)
  process.exit(0)
})
