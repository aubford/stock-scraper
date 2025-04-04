require("../globalEnv")
const { zacks } = require("../src/sources")
const puppeteer = require("puppeteer-core")

const ticker = "PGR"

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    zacks
      .fetch(ticker, browser)
      .then(res => {
        console.log(res)
      })
      .catch(err => console.error(err))
  })
  .catch(err => console.error(err))
