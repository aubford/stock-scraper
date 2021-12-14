const puppeteer = require("puppeteer-core")
const {
  newBrowserPage,
  promptForTickers,
  promptLogin,
  backupReturnStockDataFile,
  getOnlyStockTickerData,
} = require("./util")
const scrapeDataForTickers = require("./scrapeDataForTickers")
const { exec } = require("child_process")

const exit = () => {
  exec("killall caffeinate")
  console.log("Scrape Complete: SUCCESS 🎉")
  process.exit(0)
}

puppeteer.connect(CONNECTION).then(async browser => {
  const newPage = (url, options) => newBrowserPage(browser, url, options)
  const closeLoginPages = await promptLogin(newPage)
  const promptResponse = await promptForTickers()

  exec("caffeinate")

  console.warn("********  Turn on PDF Viewer extension!!!! ********")

  const tickers = promptResponse
    ? promptResponse.split(/[^A-Z]/).filter(a => a)
    : Object.keys(getOnlyStockTickerData(backupReturnStockDataFile()))

  closeLoginPages()

  await scrapeDataForTickers(tickers, browser)

  exit()
})
