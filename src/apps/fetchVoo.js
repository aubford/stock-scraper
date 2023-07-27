const puppeteer = require("puppeteer-core")
const { exit } = require("../util")
const scrapeDataForVoo = require("../scrapeDataForVoo")
const allTickers = require("../vooTickers")
const { beginAndLogin } = require("../puppeteer")

const tickers = allTickers.slice(0, allTickers.length / 2)

puppeteer.connect(CONNECTION).then(async browser => {
  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForVoo(tickers, browser, SHOULD_MERGE)

  exit()
})
