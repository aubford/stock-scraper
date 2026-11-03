const { groupBy, mapValues } = require("lodash")

const {
  renameCSVs,
  unrealizedPath,
  parseCSV,
  getUnrealizedCostBasis,
  getUnrealizedShares,
} = require("../csv/csv-util")
const { metaWriteOut, promptUser, openInBrowser } = require("../util")
const fetchSPWeights = require("./fetchSPWeights")

const SYMBOL_HEADER = "Symbol"

const main = async () => {
  console.log("🚀 Get CSV 🚀")
  await openInBrowser("https://olui2.fs.ml.com/TFPDownloads/TFPDownloads.aspx") 
  await promptUser(`Download "security" CSV and then press Enter`)
  renameCSVs()
  const unrealizedTaxLotsCsv = await parseCSV(unrealizedPath)
  const unrealizedTaxLots = groupBy(unrealizedTaxLotsCsv, SYMBOL_HEADER)

  await fetchSPWeights()

  metaWriteOut({
    myStocks: mapValues(unrealizedTaxLots, csvRows => ({
      my_costBasis: getUnrealizedCostBasis(csvRows),
      my_shares: getUnrealizedShares(csvRows),
    })),
  })
}

module.exports = main