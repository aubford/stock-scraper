const puppeteer = require("puppeteer")
const _ = require("lodash")

const getText = async (page, selector) => {
  const element = await page.$(selector)
  if (!element) {
    return "N/A"
  }
  const text = await element.evaluate(node => node.textContent)
  return text
}

/** @returns {Promise<Page>} */
async function newPage(browser, url) {
  /** @type {Page} */
  const page = await browser.newPage()
  await page.on("console", msg => console.log("PAGE LOG:", msg.text()))

  await page.goto(url)
  
  await page.waitForSelector(".textLayer > span")
  return page
}

function test() {
  puppeteer
    .connect({
      browserWSEndpoint:
        "ws://localhost:49275/devtools/browser/0b82c804-c1c5-ed4d-b415-82bc15cbf7a9",
      product: "firefox",
      defaultViewport: {
        width: 1400,
        height: 1800
      }
    })
    .then(async browser => {
      const page = await newPage(
        browser,
        `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=BLK&c_name=invest_VENDOR`
      )
      const elements = await page.$x("/html/body/div[1]/div[2]/div[4]/div/div[1]/div[2]/span[36]")
      const text = await elements[0].evaluate(node => node.textContent)
      
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
