const { exit, getStockTickers } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

const tickers = getStockTickers()

connectAndRunApp(async browser => {
  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForTickers(tickers, browser, SHOULD_MERGE)
  exit()
})
