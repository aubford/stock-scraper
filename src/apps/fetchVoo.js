const puppeteer = require("puppeteer-core")
const { newBrowserPage } = require("../puppeteer")
const { promptUser, promptLogin, begin, exit } = require("../util")
const scrapeDataForVoo = require("../scrapeDataForVoo")
const tickers = require("../vooTickers")

puppeteer.connect(CONNECTION).then(async browser => {
  begin()

  const closeLoginPages = await promptLogin((url, options) =>
    newBrowserPage(browser, url, options)
  )

  await promptUser("Press Enter")

  closeLoginPages()

  await scrapeDataForVoo(tickers, browser, SHOULD_MERGE)

  exit()
})
