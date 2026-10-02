const { runDebug } = require("../src/util/runDebug")

runDebug(
  async ticker => {
    const { yahoo } = require("../src/sources")
    await yahoo.fetchVooIndexHistoricalPrices(true)
    return yahoo.fetch(ticker)
  },
  { ticker: "SNOW" }
)
