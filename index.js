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
        `http://www.brainjar.com/java/host/test.html`
      )
      const content = await page.content()
      console.log(content)
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
