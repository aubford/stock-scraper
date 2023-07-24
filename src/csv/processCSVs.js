const { groupBy, mapValues } = require("lodash")
const {
  renameCSVs,
  unrealizedPath,
  parseCSV,
  getUnrealizedCostBasis,
  getUnrealizedShares,
} = require("./csv-util")
const { writeToExistingTickers } = require("../util")

renameCSVs()

const SYMBOL_HEADER = "Symbol"

const main = async () => {
  const unrealizedTaxLotsCsv = await parseCSV(unrealizedPath)
  const unrealizedTaxLots = groupBy(unrealizedTaxLotsCsv, SYMBOL_HEADER)

  const costBases = mapValues(unrealizedTaxLots, csvRows => ({
    my_costBasis: getUnrealizedCostBasis(csvRows),
    my_shares: getUnrealizedShares(csvRows),
  }))

  writeToExistingTickers(costBases)
}

main()
