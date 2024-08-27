const { promptForYes, getUnstagedVooTickers, exit, getVooTickers } = require("../util")
const scrapeDataForVoo = require("../scrapeDataForVoo")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

connectAndRunApp(async browser => {
  const fetchUnstagedOnly = await promptForYes("Fetch unstaged only? (plus staged w/ errors)")
  const tickers = fetchUnstagedOnly ? getUnstagedVooTickers() : getVooTickers()

  await beginAndLogin(browser, "Press Enter")
  await scrapeDataForVoo(tickers, browser)

  exit()
})
