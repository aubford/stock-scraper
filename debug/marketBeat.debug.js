const { runDebug } = require("../src/util/runDebug")

runDebug((ticker, browser) => require("../src/sources").marketBeat.fetch(ticker, browser), {
  ticker: "AAPL",
  browser: true,
})
