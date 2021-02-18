const puppeteer = require("puppeteer-core")
const _ = require("lodash")
const fs = require("fs")
const {
  getTextByX,
  newBrowserPage,
  prevSiblingTextIs,
  prevSiblingTextContains,
} = require("./util")
const { webSocketDebuggerUrl } = require("./ws.json")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

/* NOTES

webSocketDebuggerUrl

 */

puppeteer.connect(connection).then(async browser => {
  const ticker = "GS"
  const newPage = url => newBrowserPage(browser, url)

  // TEST CODE

  const testFunc = async () => {
    const xPathArr = [
      `//*[@id="viewer"]/div[1]/div[2]/span[3]`,
      prevSiblingTextIs("ARGUS RATING: "),
      prevSiblingTextIs("Target Price"),
      prevSiblingTextIs("Financial Strength Rating"),
      prevSiblingTextIs("1 Year EPS Growth Forecast"),
      prevSiblingTextIs("5 Year EPS Growth Forecast"),
      prevSiblingTextIs("1 Year Dividend Growth Forecast"),
    ]
    const page = await newPage(
      `https://research2.fidelity.com/fidelity/research/reports/pdf/getReport.asp?feedID=11&docTag=172967424&version=285317ANOTE`
    )
    
    await page.waitForSelector("frame")
    
    //const frames = await page.frames()
    //let text = await frames[1].evaluate(() => {
    //  document.querySelector(".textLayer > span")
    //})
    
    const src = await page.$eval("frame", node => node.getAttribute("src"))
    const pdf = await newPage(`https://research2.fidelity.com/cgi-bin/upload.dll/${src}`)
    
    
    
    
    console.log("********************* HIT ******************",text)
  }

  const output = await testFunc()
  fs.writeFile("./testOutput.json", JSON.stringify(output), err => {
    console.log(err)
    process.exit(0)
  })
})
