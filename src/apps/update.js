const { exit, getUnstagedStockTickers } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

const tickers = getUnstagedStockTickers()

connectAndRunApp(async browser => {
  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForTickers(tickers, browser)
  exit()
})
