const { runDebug } = require("../src/util/runDebug")

runDebug((ticker, browser) => require("../src/sources").zacks.fetch(ticker, browser), {
  ticker: "PGR",
  browser: true,
})
