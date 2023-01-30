require("../../preload")
const puppeteer = require("puppeteer-core")
const { zacks } = require("../../src/api")

const ticker = "VOO"

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    const fetch = zacks.fetch

    const res = await fetch(ticker, browser)
    console.log("success!!!")
    console.log(res)
  })
  .catch(err => console.error(err))
