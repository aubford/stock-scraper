const { exit, getUnstagedStockTickers, getStockTickers, promptForYes } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

/**
 * @param {{ skipPrompt?: boolean, fetchUnstagedOnly?: boolean }} [options]
 */
module.exports = async ({ skipPrompt = false, fetchUnstagedOnly } = {}) =>
  await connectAndRunApp(async browser => {
    console.log("🚀 Update Stocks 🚀")
    console.log("🚀 DONT FORGET TO LAUNCH BROWSER!!! 🚀")
    if (fetchUnstagedOnly == null && !skipPrompt) {
      fetchUnstagedOnly = await promptForYes("Fetch unstaged only? (plus staged w/ errors)")
    }
    const tickers = fetchUnstagedOnly ? getUnstagedStockTickers() : getStockTickers()

    await beginAndLogin(browser, "Press Enter")
    await scrapeDataForTickers(tickers, browser)
    await exit("Update")
  })
