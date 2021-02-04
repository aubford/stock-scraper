const puppeteer = require("puppeteer-extra")
const credentials = require("creds.json")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker")

puppeteer.use(AdblockerPlugin({ blockTrackers: true }))
puppeteer.use(StealthPlugin())

async function fidelityLogin(page) {
  const url = "https://www.schwab.com/public/schwab/nn/login/login.html?lang=en"

  await page.setViewport({ width: 1366, height: 768 })

  await page.goto(url)
  await page.click("#LoginId")
  await page.keyboard.type(credentials.schwabUsername)

  await page.click("#Password")
  await page.keyboard.type(credentials.schwabPassword)
  await page.click("#LoginSubmitBtn")
  await page.waitForNavigation()
  await page.screenshot({ path: "linkedin.png" })
}

puppeteer.launch({headless:true}).then(async browser => {
  const page = await browser.newPage()
  
  

  browser.close()
})
