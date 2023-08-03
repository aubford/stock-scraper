const puppeteer = require("puppeteer-core")
const { exit } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin } = require("../puppeteer")

puppeteer.connect(CONNECTION).then(async browser => {
  const promptResponse = await beginAndLogin(browser, "Tickers: ")

  const tickers = promptResponse.split(/[^A-Z]/).filter(a => a)

  await scrapeDataForTickers(tickers, browser, SHOULD_MERGE)

  exit()
})
