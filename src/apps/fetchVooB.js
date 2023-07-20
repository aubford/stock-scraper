const puppeteer = require("puppeteer-core")
const { exit, beginAndLogin } = require("../util")
const scrapeDataForVoo = require("../scrapeDataForVoo")
const allTickers = require("../vooTickers")

const tickers = allTickers.slice(allTickers.length / 2)

puppeteer.connect(CONNECTION).then(async browser => {
  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForVoo(tickers, browser, SHOULD_MERGE)

  exit()
})
