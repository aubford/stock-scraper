require("../../preload")
const puppeteer = require("puppeteer-core")
const { fidelityAnalysts, newConstructs, tipranks, td } = require("../../src/api")
const { promptUser } = require("../../src/util")

/** @type {{fetch: function}} */
const analystMap = {
  nc: newConstructs,
  fidelity: fidelityAnalysts,
  tipranks: tipranks,
  td: td,
}

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    const analyst = await promptUser("Analyst: ")
    const ticker = await promptUser("Ticker: ")
    const fetch = analystMap[analyst].fetch

    await fetch(ticker, browser)
    console.log("success!!!")
  })
  .catch(err => console.error(err))
