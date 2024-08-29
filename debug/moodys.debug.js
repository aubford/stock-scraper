require("../globalEnv")
const { moodys } = require("../src/sources")
const puppeteer = require("puppeteer-core")

const ticker = "SHOP"

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    const res = await moodys.fetch(ticker, browser)
    console.log("success!!!")
    console.log(res)
  })
  .catch(err => console.error(err))
