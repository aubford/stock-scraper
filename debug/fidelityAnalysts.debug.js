require("../preload")
const puppeteer = require("puppeteer-core")
const { fidelityAnalysts } = require("../src/api")

const ticker = "AAPL"

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    const res = await fidelityAnalysts.fetch(ticker, browser)
    console.log("success!!!")
    console.log(res)
  })
  .catch(err => console.error(err))
