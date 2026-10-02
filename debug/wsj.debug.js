const { runDebug } = require("../src/util/runDebug")

runDebug((ticker, browser) => require("../src/sources").wsj.fetch(ticker, browser), {
  ticker: "BAC",
  browser: true,
})
