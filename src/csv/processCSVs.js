// const os = require("os")
const { groupBy, mapValues, round } = require("lodash")
const { renameCSVs, unrealizedPath, parseCSV, getCostBasis } = require("./csv-util")
const { writeToExistingTickers } = require("../util")

renameCSVs()

const main = async () => {
  const unrealizedTaxLotsCsv = await parseCSV(unrealizedPath)
  const unrealizedTaxLots = groupBy(unrealizedTaxLotsCsv, "Symbol")
  const costBases = mapValues(unrealizedTaxLots, csvRow => ({
    costBasis: round(getCostBasis(csvRow), 2),
  }))

  writeToExistingTickers(costBases)
}

main()
