const puppeteer = require("puppeteer-core")
const { exit, beginAndLogin, getStockTickers } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")

puppeteer.connect(CONNECTION).then(async browser => {
  const promptResponse = await beginAndLogin(browser, "Tickers: ")

  const tickers = promptResponse
    ? promptResponse.split(/[^A-Z]/).filter(a => a)
    : getStockTickers()

  await scrapeDataForTickers(tickers, browser, SHOULD_MERGE)

  exit()
})
