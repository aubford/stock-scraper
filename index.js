/**
 * @typedef {Page} MyPage
 * @property getText
 */

const puppeteer = require("puppeteer")
const _ = require("lodash")

const connection = {
  browserWSEndpoint: "ws://localhost:49275/devtools/browser/0b82c804-c1c5-ed4d-b415-82bc15cbf7a9",
  product: "firefox",
  defaultViewport: {
    width: 1400,
    height: 1800
  }
}

const getText = async (page, selector) => {
  const element = await page.$x(selector)
  const text = await element[0].evaluate(node => node.textContent)
  return text
}


/** @returns {Promise<MyPage>} */
async function newPage(browser, url) {
  /** @type {MyPage} */
  const page = await browser.newPage()
  await page.on("console", msg => console.log("PAGE LOG:", msg.text()))

  await page.goto(url)
  
  page.getText = text => getText(page, text)
  return page
}

function test() {
  puppeteer.connect(connection).then(async browser => {
    const page = await newPage(
      browser,
      `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=BLK&c_name=invest_VENDOR`
    )
    
    await page.waitForSelector(".textLayer > span")

    const text = await page.getText("/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[36]")

    console.log(text)
  })
}

test()

const tickers = [
  "C",
  "BA",
  "JPM",
  "BLK",
  "GS",
  "UVSP",
  "FHB",
  "ISBC",
  "V",
  "MA",
  "AXP",
  "SEDG",
  "ATVI"
]
