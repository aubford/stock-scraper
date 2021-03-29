const puppeteer = require("puppeteer-core")
const _ = require("lodash")
const fetch = require("node-fetch")
const fs = require("fs")
const { webSocketDebuggerUrl } = require("../ws.json")
const makeScrapeTools = require("../src/makeScrapeTools")
const { newBrowserPage } = require("../src/util")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

const headers = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "accept-language": "en-US,en;q=0.9,es;q=0.8",
  "cache-control": "max-age=0",
  "sec-ch-ua": '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
}
const referer = "origin-when-cross-origin"

const delay = ms => new Promise(res => setTimeout(res, ms))

puppeteer.connect(connection).then(async browser => {
  const testFunc = async () => {
    const page = await browser.newPage()
    //await page.setBypassCSP(true)
    //await page.setExtraHTTPHeaders(headers)

    await page.goto(
      `https://invest.ameritrade.com/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/analystreports?symbol=USB&c_name=invest_VENDOR`,
      { waitUntil: "networkidle0" }
    )

    const frameMain = await page.frames().find(frame => frame.name() === "main")

    const analystReportsFrame = frameMain
      .childFrames()
      .find(frame => frame.name() === "tdaxModuleAnalystReportsHighchartsIframe")

    await analystReportsFrame.click(`div.highcharts-footer > button`)
    const popup = await new Promise(res =>
      browser.once("targetcreated", target => res(target.page()))
    )

    await popup.waitForSelector(`span.single-bar-internal-score.selected`)

    const tipScore = await popup.$eval(
      `span.single-bar-internal-score.selected`,
      ({ textContent }) => (textContent ? textContent.trim() : "")
    )

    console.log(tipScore)
  }

  await testFunc()

  //const output = await testFunc()
  //fs.writeFile("./testOutput.json", JSON.stringify(output), err => {
  //  console.log(err)
  //  process.exit(0)
  //})
})
