const puppeteer = require("puppeteer-core")
const { goToNewBrowserPage } = require("../puppeteer")
const { promptUser, promptLogin, begin, exit } = require("../util")
const scrapeDataForVoo = require("../scrapeDataForVoo")
const allTickers = require("../vooTickers")

const tickers = allTickers.slice(allTickers.length / 2)

puppeteer.connect(CONNECTION).then(async browser => {
  begin()

  const closeLoginPages = await promptLogin((url, options) =>
    goToNewBrowserPage(browser, url, options)
  )

  await promptUser("Press Enter")

  closeLoginPages()

  await scrapeDataForVoo(tickers, browser, SHOULD_MERGE)

  exit()
})
