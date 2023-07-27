const puppeteer = require("puppeteer-core")
const { exit, getStockTickers } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin } = require("../puppeteer")

const tickers = getStockTickers()

puppeteer.connect(CONNECTION).then(async browser => {
  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForTickers(tickers, browser, SHOULD_MERGE)
  exit()
})
