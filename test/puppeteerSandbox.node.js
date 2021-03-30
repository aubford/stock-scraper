const puppeteer = require("puppeteer-core")
const { webSocketDebuggerUrl } = require("../ws.json")
const makeScrapeTools = require("../src/makeScrapeTools")
const { fetchTipData } = require("../src/api")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

puppeteer.connect(connection).then(async browser => {
  const scrapeTools = makeScrapeTools("C", browser)
  const tipData = await fetchTipData("C", scrapeTools)

  console.log(tipData)

  process.exit(0)

  //const output = await testFunc()
  //fs.writeFile("./testOutput.json", JSON.stringify(output), err => {
  //  console.log(err)
  //  process.exit(0)
  //})
})
