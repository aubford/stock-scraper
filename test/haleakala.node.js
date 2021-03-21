const puppeteer = require("puppeteer-core")
const moment = require("moment")
const { newBrowserPage } = require("../src/util")
const { webSocketDebuggerUrl } = require("../ws.json")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

const now = new Date()
const sevenAM = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
  7,
  0,
  0,
  0
).getTime()
const waitForSeven = () => {
  const nowMillis = Date.now()
  console.log(sevenAM - nowMillis)
  return nowMillis <= sevenAM
}

const dateStr = moment(now).add(7, "days").format("dddd, MMMM D, YYYY")

const tourCalendarSelector = `#tourCalendarWithKey`
const dateSquareSelector = `//*[@id="page-content"]/main/div[2]//td[@aria-label="${dateStr}"]`
const btnSelector =
  `//*[@id="page-content"]/main/div[2]/div/div[1]/div[1]/div/div[2]/div[2]/` +
  `button[@class="sarsa-button sarsa-button-primary sarsa-button-md sarsa-button-fit-container"]`

puppeteer.connect(connection).then(async browser => {
  const newPage = url => newBrowserPage(browser, url)

  const page = await newPage(`https://www.recreation.gov/ticket/253731/ticket/255`)

  await page.waitForSelector(tourCalendarSelector)
  await page.click(tourCalendarSelector)

  await page.waitForXPath(dateSquareSelector)
  const dateSquare = await page.$x(dateSquareSelector)

  if (dateSquare.length > 1) {
    return console.error("too many date squares selected")
  }

  await dateSquare[0].click()

  await page.waitForXPath(btnSelector)
  const elementArr = await page.$x(btnSelector)
  const button = elementArr[0]

  while (waitForSeven()) {
    console.log("waiting...")
  }

  await button.click()
  console.log("hit")
  process.exit(0)
})
