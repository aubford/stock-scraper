require("../preload")
const puppeteer = require("puppeteer-core")
const { argusAnalyst } = require("../src/sources")

puppeteer
  .connect(CONNECTION)
  .then(async browser => {
    const res = await argusAnalyst.fetch(
      "HIG",
      browser,
      "https://research2.fidelity.com/fidelity/research/reports/pdf/getReport.asp?feedID=11&docTag=037833100&versionTag=497424ANOTE"
    )
    console.log(res)
  })
  .catch(err => console.error(err))
