const puppeteer = require("puppeteer")
const { webSocketDebuggerUrl } = require("./ws.json")
const _ = require("lodash")
const { newBrowserPage } = require("./util")
const mergeImg = require("merge-img")
const fs = require("fs")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  slowMo: 51,
  defaultViewport: {
    width: 1400,
    height: 1800
  }
}

const searchByAdjacentText = text => `//span[contains(text(),'${text}')]/following-sibling::span`

const tickers = ["C", "T"]

puppeteer.connect(connection).then(async browser => {
  const newPage = url => newBrowserPage(browser, url)

  const tickerData = {}
  for (let ticker of tickers) {
    let pics = []
    const fetchData = async (url, xPathArr, screenShotArr) => {
      const page = await newPage(url)
      await page.waitForXPath(xPathArr[0])

      const values = await Promise.all(xPathArr.map(page.getTextByX))

      if (screenShotArr && screenShotArr.length > 0) {
        const screenShots = await Promise.all(screenShotArr.map(clip => page.screenshot({ clip })))
        pics = pics.concat(screenShots)
      }

      await page.close()

      return values
    }

    const fordData = await fetchData(
      `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=${ticker}&c_name=invest_VENDOR`,
      [
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[36]`,
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[46]`,
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[53]`,
        searchByAdjacentText(" performance is ")
      ],
      [{ x: 330, y: 175, width: 250, height: 100 }]
    )

    const newConstructs = await fetchData(
      `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
      [
        searchByAdjacentText("(MM)"), // rating
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[69]`, // eps
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[24]`, // roic
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[63]`, // fcf yield
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[181]`, // p/ebv
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]` // growth appreciation period
      ]
    )

    const theStreet = await fetchData(
      `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=20034&documenttag=${ticker}&c_name=invest_VENDOR`,
      [
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[58]`, // growth
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[66]`, // total return
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[74]`, // efficiency
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[82]`, // price volatility
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[89]`, // solvency
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[96]`, // income
        `/html/body/div[1]/div[2]/div[4]/div/div[5]/div[2]/span[93]`, // price/earnings
        `/html/body/div[1]/div[2]/div[4]/div/div[5]/div[2]/span[122]`, // proj earnings
        `/html/body/div[1]/div[2]/div[4]/div/div[5]/div[2]/span[152]`, // p/b
        `/html/body/div[1]/div[2]/div[4]/div/div[5]/div[2]/span[181]`, // p/s
        `/html/body/div[1]/div[2]/div[4]/div/div[5]/div[2]/span[108]`, // p/cf
        `/html/body/div[1]/div[2]/div[4]/div/div[5]/div[2]/span[137]`, // p/eg
        `/html/body/div[1]/div[2]/div[4]/div/div[5]/div[2]/span[166]`, // earnings growth
        `/html/body/div[1]/div[2]/div[4]/div/div[5]/div[2]/span[195]`, // sales growth
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[12]`, // rating
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[16]` // target price
      ],
      [{ x: 300, y: 150, width: 350, height: 135 }]
    )

    // results
    const mergedJimpObj = await mergeImg(pics)
    await mergedJimpObj.write(`/Users/aubreyford/Desktop/Stock-Scrapbook/${ticker}.png`)
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
      streetPE: theStreet[6],
      streetProjEarn: theStreet[7],
      streetPB: theStreet[8],
      streetPSales: theStreet[9],
      streetPCF: theStreet[10],
      streetPEG: theStreet[11],
      streetEarningsGrowth: theStreet[12],
      streetSalesGrowth: theStreet[13],
      streetRating: theStreet[14],
      streetTargetPrice: theStreet[15]
    }
  }

  fs.writeFile("./stockData.json", JSON.stringify(tickerData), err => {
    console.log(err)
    process.exit(0)
  })
})
