require("../preload")
const puppeteer = require("puppeteer-core")
const { fidelityAnalysts } = require("../src/sources")

const ticker = "OKE"

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    const res = await fidelityAnalysts.fetch(ticker, browser)
    console.log("success!!!")
    console.log(res)
  })
  .catch(err => console.error(err))
