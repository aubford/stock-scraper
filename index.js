const puppeteer = require("puppeteer")
const { webSocketDebuggerUrl } = require("./ws.json")
const _ = require("lodash")
const { newBrowserPage, parseStreetBulletData, scrollPageToBottom } = require("./util")
const mergeImg = require("merge-img")
const fs = require("fs")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800
  }
}

const prevSiblingTextContains = (text, num = 1) =>
  `//span[contains(text(),'${text}')]/following-sibling::span[${num}]`
const prevSiblingTextIs = (text, num = 1) =>
  `//span[text()='${text}']/following-sibling::span[${num}]`

puppeteer.connect(connection).then(async browser => {
  const tickers = ["C"]

  const completedPics = []
  const exitIfAllowed = () => {
    if (completedPics.length === tickers.length) {
      process.exit(0)
    }
  }
  const newPage = url => newBrowserPage(browser, url)

  const tickerData = {}
  for (const ticker of tickers) {
    let pics = []
    const fetchData = async ({ url, xPathArr, screenShotArr, waitForPostScroll }) => {
      const page = await newPage(url)

      await page.waitForXPath(xPathArr[0])
      
      if (screenShotArr) {
        const screenShots = await Promise.all(screenShotArr.map(clip => page.screenshot({ clip })))
        pics = pics.concat(screenShots)
      }

      if (waitForPostScroll) {
        const [viewerContainer] = await page.$x(`//div[@id='viewerContainer']`)
        await viewerContainer.evaluate(node => node.scrollBy(0, 2000))
        await page.waitForXPath(waitForPostScroll)
      }

      const values = await Promise.all(xPathArr.map(page.getTextByX))

      await page.close()

      return values
    }

    const fordData = await fetchData({
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[36]`,
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[46]`,
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[53]`,
        prevSiblingTextContains(" performance is ")
      ],
      screenShotArr: [{ x: 330, y: 175, width: 250, height: 100 }]
    })

    const newConstructs = await fetchData({
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        prevSiblingTextContains("(MM)"), // rating
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[69]`, // eps
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[24]`, // roic
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[63]`, // fcf yield
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[181]`, // p/ebv
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]` // growth appreciation period
      ],
      waitForPostScroll: `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]`
    })

    const theStreet = await fetchData({
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=20034&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        prevSiblingTextIs("Growth", 2), // 0 growth
        prevSiblingTextIs("Total Return", 2), // 1 total return
        prevSiblingTextIs("Efficiency", 2), // 2 efficiency
        prevSiblingTextIs("Price Volatility", 2), // 3 price volatility
        prevSiblingTextIs("Solvency", 2), // 4 solvency
        prevSiblingTextIs("Income", 2), // 5 income
        `//span[contains(text(),'• ')]`, // 6 ...bullentPointData (lineOne)
        `//span[contains(text(),'• ')]/following-sibling::span[1]`, // 7 ...bulletPointData (lineTwo)
        `//span[text()='TARGET PRICE ']/following-sibling::span[1]` // 8 target price
      ],
      screenShotArr: [{ x: 340, y: 140, width: 520, height: 80 }],
      waitForPostScroll: "//span[contains(text(),'• ')]"
    })

    // results
    if (pics.length) {
      const mergedJimpObj = await mergeImg(pics)
      await mergedJimpObj.write(`/Users/aubreyford/Desktop/Stock-Scrapbook/${ticker}.png`, () => {
        console.log("done with image: " + ticker)
        completedPics.push(ticker)
        exitIfAllowed()
      })
    } else {
      completedPics.push(ticker)
    }

    const bulletData = parseStreetBulletData(theStreet[6], theStreet[7])

    tickerData[ticker] = {
      fordEarningsStrength: fordData[0],
      fordRelativeValuation: fordData[1],
      fordPriceMovement: fordData[2],
      fordIndustryStrength: fordData[3],
      ncRating: newConstructs[0],
      ncEps: newConstructs[1],
      ncRoic: newConstructs[2],
      ncFCF: newConstructs[3],
      ncPB: newConstructs[4],
      ncGap: newConstructs[5],
      streetGrowth: theStreet[0],
      streetTotalReturn: theStreet[1],
      streetEfficiency: theStreet[2],
      streetVolatility: theStreet[3],
      streetSolvency: theStreet[4],
      streetIncome: theStreet[5],
      streetTargetPrice: theStreet[8],
      ...bulletData
    }
  }

  fs.writeFile("./stockData.json", JSON.stringify(tickerData), err => {
    console.log("error: " + err)
    exitIfAllowed()
  })
})
