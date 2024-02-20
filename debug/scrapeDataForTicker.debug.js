require("../preload")
const puppeteer = require("puppeteer-core")
const scrapeDataForTicker = require("../src/scrapeDataForTicker")
const { yahoo } = require("../src/sources")

const ticker = "CRM"

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    await yahoo.fetchVooIndexHistoricalPrices()
    const res = await scrapeDataForTicker(ticker, browser)
    console.log("success!!!")
    console.log(res)
  })
  .catch(err => console.error(err))
