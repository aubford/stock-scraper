const puppeteer = require("puppeteer-core")
const { webSocketDebuggerUrl } = require("./ws.json")
const _ = require("lodash")
const {
  evalX,
  newBrowserPage,
  parseStreetBulletData,
  prevSiblingTextIs,
  prevSiblingTextContains,
  ARGUS_ANALYST_KEY,
  ARGUS_RESEARCH_KEY,
  ZACKS_KEY,
} = require("./util")
const mergeImg = require("merge-img")
const fs = require("fs")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}
const SCRAPBOOK_LOCATION = "/Users/aubrey/Google Drive/stock-scrapbook"

puppeteer.connect(connection).then(async browser => {
  const tickers = ["T"]

  const completedPics = []
  const exitIfAllowed = () => {
    if (completedPics.length === tickers.length) {
      process.exit(0)
    }
  }
  const newPage = url => newBrowserPage(browser, url)
  const getFidelitySecretUrl = async fidelityLink => {
    if (!fidelityLink) {
      return null
    }
    const page = await newPage(fidelityLink.href)
    const src = await page.$eval("frame", node => node.getAttribute("src"))
    await page.close()
    return `https://research2.fidelity.com/cgi-bin/upload.dll/${src}`
  }

  const newStockData = {}
  for (const ticker of tickers) {
    // UTIL
    let pics = []
    const fetchPdfData = async ({ url, xPathArr, screenShotArr, waitForPostScroll }) => {
      if (!url) {
        return []
      }
      const page = await newPage(url)

      await page.waitForXPath(xPathArr[0])

      if (screenShotArr) {
        const screenShots = await Promise.all(
          screenShotArr.map(clip => page.screenshot({ clip }))
        )
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

    const fetchPageData = async ({ url, xPathArr }) => {
      if (!url) {
        return {}
      }
      const page = await newPage(url)
      await page.waitForXPath(xPathArr[0])
      const values = await Promise.all(xPathArr.map(page.getTextByX))
      return { page, values }
    }

    // FIDELITY
    const {
      values: [
        fidelityStarmineOneName,
        fidelityStarmineTwoName,
        fidelityStarmineThreeName,
        fidelityStarmineFourName,
        fidelityStarmineFiveName,
        fidelityStarmineOneRating,
        fidelityStarmineTwoRating,
        fidelityStarmineThreeRating,
        fidelityStarmineFourRating,
        fidelityStarmineFiveRating,
        fidelityReportNameArr,
      ],
      page: fidelityPage,
    } = await fetchPageData({
      url: `https://eresearch.fidelity.com/eresearch/goto/evaluate/analystsOpinions.jhtml?symbols=${ticker}`,
      xPathArr: [
        `//table[@id="sentSummaryTable"]/tbody/tr[1]/td[1]/span`,
        `//table[@id="sentSummaryTable"]/tbody/tr[2]/td[1]/span`,
        `//table[@id="sentSummaryTable"]/tbody/tr[3]/td[1]/span`,
        `//table[@id="sentSummaryTable"]/tbody/tr[4]/td[1]/span`,
        `//table[@id="sentSummaryTable"]/tbody/tr[5]/td[1]/span`,
        `//table[@id="sentSummaryTable"]/tbody/tr[1]/td[3]/span[@class="opinion"]`,
        `//table[@id="sentSummaryTable"]/tbody/tr[2]/td[3]/span[@class="opinion"]`,
        `//table[@id="sentSummaryTable"]/tbody/tr[3]/td[3]/span[@class="opinion"]`,
        `//table[@id="sentSummaryTable"]/tbody/tr[4]/td[3]/span[@class="opinion"]`,
        `//table[@id="sentSummaryTable"]/tbody/tr[5]/td[3]/span[@class="opinion"]`,
        `//table[@id="allOpinionsTable"]/tbody/tr/td[1]/span`,
      ],
    })

    const reportHrefsHandles = await fidelityPage.$x(
      `//table[@id="allOpinionsTable"]/tbody/tr/td[9]`
    )

    const reportLinks = await Promise.all(
      reportHrefsHandles.map(handle =>
        evalX(handle, "a", node => {
          const href = node.href
          const text = node.textContent

          if (href === "javascript:void(0);") {
            return { text, href: node.getAttribute("onclick").split(`'`)[1] }
          }

          return { text, href }
        })
      )
    )

    const {
      [ARGUS_ANALYST_KEY]: argusAnalystLink,
      [ARGUS_RESEARCH_KEY]: argusResearchLink,
      [ZACKS_KEY]: zacksLink,
    } = _.fromPairs(_.zip(fidelityReportNameArr, reportLinks))

    await fidelityPage.close()

    // FORD
    const [
      fordEarningsStrength,
      fordRelativeValuation,
      fordPriceMovement,
      fordIndustryStrength,
    ] = await fetchPdfData({
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[36]`,
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[46]`,
        `/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[53]`,
        prevSiblingTextContains(" performance is "),
      ],
      screenShotArr: [{ x: 330, y: 175, width: 250, height: 100 }],
    })

    // ARGUS ANALYST
    const [
      argusAnalystRating,
      argusAnalystTarget,
      argusAnalystFinancialStrength,
      argusAnalystOneYrEpsGrowth,
      argusAnalystFiveYrEpsGrowth,
      argusAnalystOneYrDivGrowth,
    ] = await fetchPdfData({
      url: await getFidelitySecretUrl(argusAnalystLink),
      xPathArr: [
        prevSiblingTextIs("ARGUS RATING: "),
        prevSiblingTextIs("Target Price"),
        prevSiblingTextIs("Financial Strength Rating"),
        prevSiblingTextIs("1 Year EPS Growth Forecast"),
        prevSiblingTextIs("5 Year EPS Growth Forecast"),
        prevSiblingTextIs("1 Year Dividend Growth Forecast"),
      ],
    })

    // THE STREET
    const [
      streetGrowth,
      streetTotalReturn,
      streetEfficiency,
      streetVolatility,
      streetSolvency,
      streetIncome,
      streetBulletDataLineOne,
      streetBulletDataLineTwo,
      streetTargetPrice,
    ] = await fetchPdfData({
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
        `//span[text()='TARGET PRICE ']/following-sibling::span[1]`, // 8 target price
      ],
      screenShotArr: [{ x: 340, y: 140, width: 520, height: 80 }],
      waitForPostScroll: "//span[contains(text(),'• ')]",
    })

    // ARGUS RESEARCH
    const xpathHelper = `text()='M' or text()='H' or text()='L'`
    const [
      argusResearchTarget,
      argusResearchRating,
      [
        argusResearchManagement,
        argusResearchSafety,
        argusResearchFinancialStrength,
        argusResearchGrowth,
        argusResearchValue,
      ],
    ] = await fetchPdfData({
      url: argusResearchLink.href,
      xPathArr: [
        prevSiblingTextIs("Target Price:"),
        prevSiblingTextIs("Argus Rating:", 3),
        `//span[${xpathHelper}]/following-sibling::span[position()=1 and (${xpathHelper})]`,
      ],
    })

    // NEW CONSTRUCTS
    const [ncRating, ncEps, ncRoic, ncFCF, ncPB, ncGap] = await fetchPdfData({
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        prevSiblingTextContains("(MM)"), // rating
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[69]`, // eps
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[24]`, // roic
        `/html/body/div[1]/div[2]/div[4]/div/div[2]/div[2]/span[63]`, // fcf yield
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[181]`, // p/ebv
        `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]`, // growth appreciation period
      ],
      waitForPostScroll: `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]`,
    })

    // ZACKS
    const [
      zacksTarget,
      zacksRecommendation,
      zacksRank,
      zacksVGM,
      zacksValue,
      zacksGrowth,
      zacksMomentum,
      zacksIndustryRank,
    ] = await fetchPdfData({
      url: await getFidelitySecretUrl(zacksLink),
      xPathArr: [
        prevSiblingTextIs("Price Target (6-12 Months): "),
        prevSiblingTextIs("Zacks Recommendation:", 4),
        prevSiblingTextIs(`Zacks Style Scores:`),
        prevSiblingTextIs(`VGM:`),
        `//*[@id="viewer"]//span[contains(text(),"Value: ")]`,
        `//*[@id="viewer"]//span[contains(text(),"Growth: ")]`,
        `//*[@id="viewer"]//span[contains(text(),"Momentum: ")]`,
        prevSiblingTextIs(`Zacks Industry Rank`),
      ],
    })

    // RESULT
    newStockData[ticker] = {
      fidelityStarmineOne: `${fidelityStarmineOneName} - ${fidelityStarmineOneRating}`,
      fidelityStarmineTwo: `${fidelityStarmineTwoName} - ${fidelityStarmineTwoRating}`,
      fidelityStarmineThree: `${fidelityStarmineThreeName} - ${fidelityStarmineThreeRating}`,
      fidelityStarmineFour: `${fidelityStarmineFourName} - ${fidelityStarmineFourRating}`,
      fidelityStarmineFive: `${fidelityStarmineFiveName} - ${fidelityStarmineFiveRating}`,
      argusResearchLink: argusResearchLink.href,
      argusResearchDate: argusResearchLink.text,
      argusResearchTarget,
      argusResearchRating,
      argusResearchManagement,
      argusResearchSafety,
      argusResearchFinancialStrength,
      argusResearchGrowth,
      argusResearchValue,
      argusAnalystLink: argusAnalystLink.href,
      argusAnalystDate: argusAnalystLink.text,
      argusAnalystRating,
      argusAnalystTarget,
      argusAnalystFinancialStrength,
      argusAnalystOneYrEpsGrowth,
      argusAnalystFiveYrEpsGrowth,
      argusAnalystOneYrDivGrowth,
      zacksLink: zacksLink.href,
      zacksDate: zacksLink.text,
      zacksTarget,
      zacksRecommendation,
      zacksRank,
      zacksVGM,
      zacksValue,
      zacksGrowth,
      zacksMomentum,
      zacksIndustryRank,
      fordEarningsStrength,
      fordRelativeValuation,
      fordPriceMovement,
      fordIndustryStrength,
      ncRating,
      ncEps,
      ncRoic,
      ncFCF,
      ncPB,
      ncGap,
      streetGrowth,
      streetTotalReturn,
      streetEfficiency,
      streetVolatility,
      streetSolvency,
      streetIncome,
      streetTargetPrice,
      ...parseStreetBulletData(streetBulletDataLineOne, streetBulletDataLineTwo),
    }

    // SCREENSHOTS
    if (pics.length) {
      const mergedJimpObj = await mergeImg(pics)
      await mergedJimpObj.write(`${SCRAPBOOK_LOCATION}/${ticker}.png`, () => {
        console.log("done with image: " + ticker)
        completedPics.push(ticker)
        exitIfAllowed()
      })
    } else {
      completedPics.push(ticker)
    }
  }
  
  // WRITE FILE OUT
  const stockDataLocation = `${SCRAPBOOK_LOCATION}/stockData.json`
  const stockDataFile = fs.readFileSync(stockDataLocation)
  const currentStockData = JSON.parse(stockDataFile)
  const writeToFile = {
    ...currentStockData,
    ...newStockData
  }

  fs.writeFile("./stockData.json", JSON.stringify(writeToFile), err => {
    console.log("test file write error: " + err)
    fs.writeFile(stockDataLocation, JSON.stringify(writeToFile), err => {
      console.log("scrapbook file write error: " + err)
      exitIfAllowed()
    })
  })
})
