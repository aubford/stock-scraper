const { runDebug } = require("../src/util/runDebug")

runDebug(
  (ticker, browser) => require("../src/sources").fidelityAnalysts.fetch(ticker, browser),
  { ticker: "OKE", login: ["Fidelity"] }
)
