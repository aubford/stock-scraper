const { exit, getUnstagedStockTickers, getStockTickers, promptForYes } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

module.exports = async (skipPrompt) => connectAndRunApp(async browser => {
  let fetchUnstagedOnly = false
  if (!skipPrompt) {
    fetchUnstagedOnly = await promptForYes("Fetch unstaged only? (plus staged w/ errors)")
  }
  const tickers = fetchUnstagedOnly ? getUnstagedStockTickers() : getStockTickers()

  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForTickers(tickers, browser)
  await exit()
})
