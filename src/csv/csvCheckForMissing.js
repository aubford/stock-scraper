require("../../globalEnv")
const { warnMissingCsvStockTickers } = require("../util")

const exitCode = warnMissingCsvStockTickers()
process.exit(exitCode)
