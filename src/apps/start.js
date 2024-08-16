const { exit } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

connectAndRunApp(async browser => {
  const promptResponse = await beginAndLogin(browser, "Tickers: ")

  const tickers = promptResponse.split(/[^A-Z]/).filter(a => a)

  await scrapeDataForTickers(tickers, browser)

  exit()
})
