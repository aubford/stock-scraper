require("../globalEnv")
const { wsj } = require("../src/sources")
const puppeteer = require("puppeteer-core")

const ticker = "BAC"

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    const res = await wsj.fetch(ticker, browser)
    console.log("success!!!")
    console.log(res)
  })
  .catch(err => console.error(err))
