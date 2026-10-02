const { runDebug } = require("../src/util/runDebug")

runDebug(
  async (ticker, browser) => {
    const scrapeDataForTicker = require("../src/scrapeDataForTicker")
    const { yahoo } = require("../src/sources")
    await yahoo.fetchVooIndexHistoricalPrices()
    return scrapeDataForTicker(ticker, browser)
  },
  { ticker: "CRM", login: ["Fidelity", "Merrill"] }
)
