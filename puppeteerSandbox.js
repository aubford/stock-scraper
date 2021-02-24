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


  const testFunc = async () => {
    // TEST CODE
    
  }

  const output = await testFunc()
  fs.writeFile("./testOutput.json", JSON.stringify(output), err => {
    console.log(err)
    process.exit(0)
  })
})
