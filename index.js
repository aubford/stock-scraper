const puppeteer = require("puppeteer")
const _ = require("lodash")
const { browserWSEndpoint } = require("./browserWSEndpoint.json")
const { newBrowserPage } = require("./util")

const connection = {
  browserWSEndpoint,
  product: "firefox",
  defaultViewport: {
    width: 1400,
    height: 1800
  }
}

puppeteer.connect(connection).then(async browser => {
  const newPage = url => newBrowserPage(browser, url)
  const fetchData = async (url, xPathArr) => {
    const page = await newPage(url)
    await page.waitForXPath(xPathArr[0])

    const values = await Promise.all(xPathArr.map(page.getTextByX))
    return values
  }
  
  const TICKER = "BLK"
  const fordUrl = `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=${TICKER}&c_name=invest_VENDOR`
  
  const fordData = await fetchData(fordUrl, ["/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[36]"])
  
  
})


