const credentials = require("./creds.json")

//const StealthPlugin = require("puppeteer-extra-plugin-stealth")
//const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker")
//puppeteer.use(AdblockerPlugin({ blockTrackers: true }))
//puppeteer.use(StealthPlugin())

async function schwabLogin(browser) {
  const page = await newPage(
    browser,
    "https://lms.schwab.com/Login?ClientId=schwab-secondary&Region=&RedirectUri=https://client.schwab.com/Login/Signon/AuthCodeHandler.ashx&StartInSetId=1"
  )

  await page.click("#LoginId")
  await page.keyboard.type(credentials.schwabUsername)
  await page.click("#Password")
  await page.keyboard.type(credentials.schwabPassword)
  await page.click("#LoginSubmitBtn")

  await page.waitForNavigation()

  return page
}


function main(tickers) {
  puppeteer.launch({ headless: false, slowMo: 51 }).then(async browser => {
    const processPageData = async pageFunc => {
      const promises = tickers.map(ticker => pageFunc(ticker, browser))
      const data = await Promise.all(promises)
      return _.fromPairs(data)
    }

    await browser.close()
    process.exit(1)
  })
}