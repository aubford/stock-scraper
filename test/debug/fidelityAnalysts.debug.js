require("../../preload")
const puppeteer = require("puppeteer-core")
const { fidelityAnalysts } = require("../../src/api")

const ticker = "AAPL"

puppeteer.connect(CONNECTION).then(async browser => {
  await fidelityAnalysts.fetch(ticker, browser)
  console.log("success!!!")
})
