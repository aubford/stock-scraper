// const os = require("os")
const { groupBy, mapValues } = require("lodash")
const {
  renameCSVs,
  unrealizedPath,
  parseCSV,
  getUnrealizedCostBasis,
  getUnrealizedValue,
} = require("./csv-util")
const { writeToExistingTickers } = require("../util")

renameCSVs()

const main = async () => {
  const unrealizedTaxLotsCsv = await parseCSV(unrealizedPath)
  const unrealizedTaxLots = groupBy(unrealizedTaxLotsCsv, "Symbol")
  const costBases = mapValues(unrealizedTaxLots, csvRows => ({
    my_costBasis: getUnrealizedCostBasis(csvRows),
    my_shares: getUnrealizedValue(csvRows),
  }))

  writeToExistingTickers(costBases)
}

main()
