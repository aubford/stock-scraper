const { runDebug } = require("../src/util/runDebug")

runDebug((ticker, browser) => require("../src/sources").boa.fetch(ticker, browser), {
  ticker: "MRNA",
  login: ["Merrill"],
})
