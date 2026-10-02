const { runDebug } = require("../src/util/runDebug")

runDebug(
  (ticker, browser) =>
    require("../src/sources").argusAnalyst.fetch(
      ticker,
      browser,
      "https://research2.fidelity.com/fidelity/research/reports/pdf/getReport.asp?feedID=11&docTag=037833100&versionTag=497424ANOTE"
    ),
  { ticker: "HIG", login: ["Fidelity"] }
)
