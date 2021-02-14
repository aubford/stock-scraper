const puppeteer = require("puppeteer")
const { browserWSEndpoint } = require("./browserWSEndpoint.json")
const { newBrowserPage } = require("./util")
const mergeImg = require("merge-img")

const connection = {
  browserWSEndpoint: "ws://127.0.0.1:9222/devtools/browser/9bcd2632-83d0-418b-a7c3-3dfb78f85a0e",
  defaultViewport: {
    width: 1400,
    height: 1800
  }
}

puppeteer.connect(connection).then(async browser => {
  const newPage = url => newBrowserPage(browser, url)

  const fetchData = async (url, xPathArr, screenShotArr) => {
    const page = await newPage(url)
    await page.waitForXPath(xPathArr[0])

    const screenShots = await Promise.all(screenShotArr.map(clip => page.screenshot({ clip })))
    const mergedJimpObj = await mergeImg(screenShots)
    await mergedJimpObj.write("./zebratime.png")

    const values = await Promise.all(xPathArr.map(page.getTextByX))
    return values
  }

  const TICKER = "SEDG"

  const fordData = await fetchData(
    `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=${TICKER}&c_name=invest_VENDOR`,
    [
      `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[36]`,
      `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[46]`,
      `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[53]`,
      `//span[contains(text(),' performance is ')]/following-sibling::span`
    ],
    [
      { x: 330, y: 175, width: 250, height: 100 },
      { x: 330, y: 1000, width: 250, height: 250 }
    ]
  )

  console.log(JSON.stringify(fordData))

  process.exit(0)
})
