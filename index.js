const puppeteer = require("puppeteer")
const { webSocketDebuggerUrl } = require("./ws.json")
const _ = require("lodash")
const { newBrowserPage } = require("./util")
const mergeImg = require("merge-img")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800
  }
}

const tickers = ["C", "SEDG", "T"]

puppeteer.connect(connection).then(async browser => {
  const newPage = url => newBrowserPage(browser, url)

  const tickerData = {}
  for (let ticker of tickers) {
    let pics = []
    const fetchData = async (url, xPathArr, screenShotArr) => {
      const page = await newPage(url)
      await page.waitForXPath(xPathArr[0])

      const values = await Promise.all(xPathArr.map(page.getTextByX))

      const screenShots = await Promise.all(screenShotArr.map(clip => page.screenshot({ clip })))
      pics = pics.concat(screenShots)
      return values
    }

    const fordData = await fetchData(
      `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=${ticker}&c_name=invest_VENDOR`,
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

    // results
    const mergedJimpObj = await mergeImg(pics)
    await mergedJimpObj.write(`/Users/aubreyford/Desktop/Stock-Scrapbook/${ticker}.png`)
    tickerData[ticker] = {
      fordEarningsStrength: fordData[0],
      fordRelativeValuation: fordData[1],
      fordPriceMovement: fordData[2],
      fordIndustryStrength: fordData[3]
    }
  }

  console.log(JSON.stringify(tickerData))
  process.exit(0)
})
