const { runDebug } = require("../src/util/runDebug")

runDebug((ticker, browser) => require("../src/sources").moodys.fetch(ticker, browser), {
  ticker: "SHOP",
  browser: true,
})
