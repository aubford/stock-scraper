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

const _ = require("lodash")

const collection = [
  ["a", 453],
  ["b", 453],
  ["a", 458],
  ["c", 453]
]

const keyBy = _.fromPairs(collection) /* ?*/


// webSocketDebuggerUrl