const { exit } = require("../util")
const scrapeDataForVoo = require("../scrapeDataForVoo")
const allTickers = require("../database/vooTickers")
const { beginAndLogin, connectAndRunApp } = require("../puppeteer")

const tickers = allTickers.slice(allTickers.length / 2)

connectAndRunApp(async browser => {
  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForVoo(tickers, browser, SHOULD_MERGE)

  exit()
})
