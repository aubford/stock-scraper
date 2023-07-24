// const os = require("os")
const { sumBy, groupBy, mapValues, omit } = require("lodash")
const {
  renameCSVs,
  unrealizedPath,
  parseCSV,
  getUnrealizedCostBasis,
  getUnrealizedValue,
} = require("./csv-util")
const { writeToExistingTickers } = require("../util")

renameCSVs()

const SYMBOL_HEADER = "Symbol"
const VALUE_HEADER = "Value ($)"

const main = async () => {
  const unrealizedTaxLotsCsv = await parseCSV(unrealizedPath)
  const unrealizedTaxLots = groupBy(unrealizedTaxLotsCsv, SYMBOL_HEADER)

  const portfolioTickers = omit(unrealizedTaxLotsCsv, ["VTI", "VOO", "RSP"])
  const totalValue = sumBy(portfolioTickers, VALUE_HEADER)

  const costBases = mapValues(unrealizedTaxLots, csvRows => ({
    my_costBasis: getUnrealizedCostBasis(csvRows),
    my_shares: getUnrealizedValue(csvRows),
    percent_of_portfolio: sumBy(csvRows, VALUE_HEADER) / totalValue,
  }))

  writeToExistingTickers(costBases)
}

main()
