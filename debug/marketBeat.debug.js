const { runDebug } = require("../src/util/runDebug")

runDebug(ticker => require("../src/sources").marketBeat.fetch(ticker), { ticker: "AAPL" })
