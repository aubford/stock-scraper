const puppeteer = require("puppeteer")

const getText = async (page, selector) => {
  /**
   * @type {ElementHandle<Element> | null}
   */
  const element = await page.$(selector)
  if (!element) {
    return "N/A"
  }
  const text = await element.evaluate(node => node.textContent)
  return text
}

const newPage = async (browser,url) => {
  /**
   * @type {Page}
   */
  const page = await browser.newPage()
  await page.on("console", msg => console.log("PAGE LOG:", msg.text()))

  await page.goto(url)
  return page
}



function test() {
  puppeteer.launch({ headless: true }).then(async browser => {
    const page = await newPage(browser,"https://www.surfertoday.com/travel/the-best-surf-spots-in-costa-rica")

    const retVal = await getText(page, ".bottom-title")

    console.log(retVal)
    await browser.close()
  })
}

test()
