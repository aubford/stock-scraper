require("../../preload")
const puppeteer = require("puppeteer-core")
const scrapeDataForTicker = require("../../src/scrapeDataForTicker")

const ticker = "AAPL"

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    const res = await scrapeDataForTicker(ticker, browser)
    console.log("success!!!")
    console.log(res)
  })
  .catch(err => console.error(err))
