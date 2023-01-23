require("../preload")
const puppeteer = require("puppeteer-core")
const scrapeDataForTicker = require("../src/scrapeDataForTicker")

const ticker = "AAPL"

puppeteer.connect(CONNECTION).then(async browser => {
  await scrapeDataForTicker(ticker, browser)
  console.log("success!!!")
})
