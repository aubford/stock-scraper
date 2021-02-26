const puppeteer = require("puppeteer-core")
const _ = require("lodash")
const fs = require("fs")
const { newBrowserPage } = require("./util")
const { webSocketDebuggerUrl } = require("./ws.json")
const prevSiblingTextContains = (text, num = 1) =>
  `//span[contains(text(),'${text}')]/following-sibling::span[${num}]`
const prevSiblingTextIs = (text, num = 1) =>
  `//span[text()='${text}']/following-sibling::span[${num}]`
const followingSiblingTextIs = (text, num = 1) =>
  `//span[text()='${text}']/preceding-sibling::span[${num}]`

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

const dateObj = new Date()
const date = dateObj.getDate()
const month = dateObj.getMonth()
const sevenAM = new Date(`2021-${month}-${date}`)
sevenAM.setHours(7)

const tourCalendarSelector = `#tourCalendarWithKey`
const dateSquareSelector = `//*[@id="page-content"]/main/div[2]//td[@aria-label="Thursday, March 4, 2021"]`
const btnSelector =
  `//*[@id="page-content"]/main/div[2]/div/div[1]/div[1]/div/div[2]/div[2]/` +
  `button[@class="sarsa-button sarsa-button-primary sarsa-button-md sarsa-button-fit-container"]`

try {
  puppeteer.connect(connection).then(async browser => {
    const newPage = url => newBrowserPage(browser, url)

    const page = await newPage(`https://www.recreation.gov/ticket/253731/ticket/255`)

    await page.waitForSelector(tourCalendarSelector)
    await page.click(tourCalendarSelector)

    await page.waitForXPath(dateSquareSelector)
    /** @type {ElementHandle[]} */
    const dateSquare = await page.$x(dateSquareSelector)

    if (dateSquare.length > 1) {
      return console.error("too many date squares selected")
    }

    await dateSquare[0].click()

    /** @type {ElementHandle[]} */
    await page.waitForXPath(btnSelector)
    const elementArr = await page.$x(btnSelector)
    const button = elementArr[0]

    while (new Date() < sevenAM) {
      console.log("waiting...")
    }

    await button.click()
    console.log("hit")
    process.exit(0)
  })
} catch (err) {
  console.log("***", err)
  process.exit(1)
}
