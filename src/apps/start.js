const puppeteer = require("puppeteer-core")
const {
  newBrowserPage,
  promptForTickers,
  promptLogin,
  backupReturnStockDataFile,
  getOnlyStockTickerData,
  begin,
  exit,
} = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")

puppeteer.connect(CONNECTION).then(async browser => {
  begin()

  const closeLoginPages = await promptLogin((url, options) =>
    newBrowserPage(browser, url, options)
  )
  const promptResponse = await promptForTickers()

  const tickers = promptResponse
    ? promptResponse.split(/[^A-Z]/).filter(a => a)
    : Object.keys(getOnlyStockTickerData(backupReturnStockDataFile()))

  closeLoginPages()

  await scrapeDataForTickers(tickers, browser, SHOULD_MERGE)

  exit()
})
