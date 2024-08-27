require("../globalEnv")
const { boa } = require("../src/sources")
const puppeteer = require("puppeteer-core")

const ticker = "MRNA"

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    const res = await boa.fetch(ticker, browser)
    console.log("success!!!")
    console.log(res)
  })
  .catch(err => console.error(err))
