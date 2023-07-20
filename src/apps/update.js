const puppeteer = require("puppeteer-core")
const { exit, getStockTickers, beginAndLogin } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")

const tickers = getStockTickers()

puppeteer.connect(CONNECTION).then(async browser => {
  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForTickers(tickers, browser, SHOULD_MERGE)
  exit()
})
