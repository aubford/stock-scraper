const puppeteer = require("puppeteer-core")
const { exit, getStockTickers } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin } = require("../puppeteer")

puppeteer.connect(CONNECTION).then(async browser => {
  const promptResponse = await beginAndLogin(browser, "Tickers: ")

  const tickers = promptResponse
    ? promptResponse.split(/[^A-Z]/).filter(a => a)
    : getStockTickers()

  await scrapeDataForTickers(tickers, browser, SHOULD_MERGE)

  exit()
})
