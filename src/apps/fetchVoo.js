const { promptForYes, getUnstagedVooTickers, exit, getVooTickers } = require("../util")
const scrapeDataForVoo = require("../scrapeDataForVoo")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

module.exports = async skipPrompt =>
  connectAndRunApp(async browser => {
    let fetchUnstagedOnly = true
    if (!skipPrompt) {
      fetchUnstagedOnly = await promptForYes("Fetch unstaged only? (plus staged w/ errors)")
    }

    const tickers = fetchUnstagedOnly ? getUnstagedVooTickers() : getVooTickers()

    if (!skipPrompt) {
      await beginAndLogin(browser, "Press Enter")
    }
    await scrapeDataForVoo(tickers, browser)

    return exit()
  })
