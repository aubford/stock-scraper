require("../../preload")
const puppeteer = require("puppeteer-core")
const { argusAnalyst } = require("../../src/api")

puppeteer.connect(CONNECTION).then(async browser => {
  await argusAnalyst.fetch("AAPL", browser, "")
  console.log("success!!!")
})
