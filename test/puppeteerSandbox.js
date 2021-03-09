const puppeteer = require("puppeteer-core")
const _ = require("lodash")
const fetch = require("node-fetch")
const fs = require("fs")
const {
  getTextByX,
  newBrowserPage,
  makeScrapeTools,
  getMoodysLink,
  prevSiblingTextIs,
  prevSiblingTextContains,
} = require("../src/util")
const { webSocketDebuggerUrl } = require("../ws.json")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

puppeteer.connect(connection).then(async browser => {
  const ticker = "T"
  const newPage = url => newBrowserPage(browser, url)
  const { fetchPageData, getPageCookies } = makeScrapeTools(ticker, browser)

  const testFunc = async () => {
    /////////// TEST CODE /////////////////////////

    const moodysCookies = await getPageCookies("https://www.moodys.com/")
    const moodysLink = await getMoodysLink("T", moodysCookies)

    if (moodysLink) {
      return await fetchPageData({
        url: `https://www.moodys.com${moodysLink.link}`,
        analystName: "moodys",
        xPathArr: [
          "//span[contains(text(),'LONG TERM RATING')]/following-sibling::div[1]/a/div",
          "//span[contains(text(),'OUTLOOK')]/following-sibling::div[1]/a/div",
        ],
      })
    }
    return []

    /////////// TEST CODE //////////////////////////
  }

  const output = await testFunc()
  fs.writeFile("./testOutput.json", JSON.stringify(output), err => {
    console.log(err)
    process.exit(0)
  })
})
