const { promptForYes, getUnstagedVooTickers, exit, getVooTickers } = require("../util")
const scrapeDataForVoo = require("../scrapeDataForVoo")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

module.exports = async skipPrompt =>
  await connectAndRunApp(async browser => {
    console.log("🚀 Fetching VOO 🚀")  
    let fetchUnstagedOnly = true
    if (!skipPrompt) {
      fetchUnstagedOnly = await promptForYes("Fetch unstaged only? (plus staged w/ errors)")
    }

    const tickers = fetchUnstagedOnly ? getUnstagedVooTickers() : getVooTickers()

    await beginAndLogin(browser, ["Fidelity"])
    await scrapeDataForVoo(tickers, browser)
    await exit("fetchVoo")
  })
