const { exit } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

/**
 * @param {{ tickers?: string[] }} [options] - given tickers skip the login/ticker prompts
 * @returns {Promise<import('../scrapeDataForTickers').ScrapeResult[] | void>}
 */
module.exports = ({ tickers } = {}) =>
  connectAndRunApp(async browser => {
    if (!tickers || !tickers.length) {
      const promptResponse = await beginAndLogin(browser, "Tickers: ")
      tickers = promptResponse.split(/[^A-Z]/).filter(a => a)
    }
    const results = await scrapeDataForTickers(tickers, browser)

    await exit("Start")
    return results
  })
