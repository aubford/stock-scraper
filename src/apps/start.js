const { exit } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

connectAndRunApp(async browser => {
  const promptResponse = await beginAndLogin(browser, "Tickers: ")

  const tickers = promptResponse.split(/[^A-Z]/).filter(a => a)
  const fs = require("fs")

  if (!fs.existsSync(STOCK_DATA_STAGING)) {
    fs.copyFileSync(STOCK_DATA_LOCATION, STOCK_DATA_STAGING)
  } 
    

  await scrapeDataForTickers(tickers, browser)

  exit()
})
