const { exit } = require("../../util")
const scrapeDataForVoo = require("../../scrapeDataForVoo")
const allTickers = require("../../database/vooTickers")
const { beginAndLogin, connectAndRunApp } = require("../../util/puppeteer-utils")

const tickers = allTickers.slice(0, allTickers.length / 2)

connectAndRunApp(async browser => {
  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForVoo(tickers, browser)

  exit()
})
