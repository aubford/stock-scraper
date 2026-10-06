const { exit, promptUser } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { beginAndLogin, connectAndRunApp } = require("../util/puppeteer-utils")

/**
 * @param {{ tickers?: string[] }} [options] - given tickers skip the ticker prompt
 * @returns {Promise<import('../scrapeDataForTickers').ScrapeResult[] | void>}
 */
module.exports = ({ tickers } = {}) =>
  connectAndRunApp(async browser => {
    await beginAndLogin(browser, ["Fidelity", "Merrill"])
    if (!tickers || !tickers.length) {
      tickers = (await promptUser("Tickers: ")).split(/[^A-Z]/).filter(a => a)
    }
    const results = await scrapeDataForTickers(tickers, browser)

    await exit("Start")
    return results
  })
