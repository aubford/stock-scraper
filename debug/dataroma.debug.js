const { runDebug } = require("../src/util/runDebug")

runDebug(ticker => require("../src/sources").dataroma.fetch(ticker), { ticker: "AAPL" })
