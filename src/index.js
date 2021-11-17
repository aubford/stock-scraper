const puppeteer = require("puppeteer-core")
const {
  newBrowserPage,
  scrapbookWriteOut,
  promptForTickers,
  promptLogin,
  backupReturnStockDataFile,
  getOnlyStockTickerData,
} = require("./util")
const scrapeDataForTickers = require("./scrapeDataForTickers")

puppeteer.connect(CONNECTION).then(async browser => {
  const newPage = (url, options) => newBrowserPage(browser, url, options)
  const closeLoginPages = await promptLogin(newPage)

  const promptResponse = await promptForTickers()

  console.warn("********  Turn on PDF Viewer extension!!!! ********")

  const tickers = promptResponse
    ? promptResponse.split(/[^A-Z]/).filter(a => a)
    : Object.keys(getOnlyStockTickerData(backupReturnStockDataFile()))

  closeLoginPages()

  const newStockData = await scrapeDataForTickers(tickers, browser)

  scrapbookWriteOut(newStockData)
  process.exit(0)
})
