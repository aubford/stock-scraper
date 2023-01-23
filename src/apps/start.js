const puppeteer = require("puppeteer-core")
const {
  promptForTickers,
  promptLogin,
  backupReturnStockDataFile,
  getOnlyStockTickerData,
  begin,
  exit,
} = require("../util")
const { goToNewBrowserPage } = require("../puppeteer")
const scrapeDataForTickers = require("../scrapeDataForTickers")

puppeteer.connect(CONNECTION).then(async browser => {
  begin()

  const closeLoginPages = await promptLogin((url, options) =>
    goToNewBrowserPage(browser, url, options)
  )
  const promptResponse = await promptForTickers()

  const tickers = promptResponse
    ? promptResponse.split(/[^A-Z]/).filter(a => a)
    : Object.keys(getOnlyStockTickerData(backupReturnStockDataFile()))

  closeLoginPages()

  await scrapeDataForTickers(tickers, browser, SHOULD_MERGE)

  exit()
})
