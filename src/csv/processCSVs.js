const { groupBy, mapValues } = require("lodash")

const {
  renameCSVs,
  unrealizedPath,
  parseCSV,
  getUnrealizedCostBasis,
  getUnrealizedShares,
} = require("./csv-util")
const { metaWriteOut, promptUser, openInChrome } = require("../util")
const { slickCharts } = require("../sources")

renameCSVs()

openInChrome("https://olui2.fs.ml.com/TFPDownloads/TFPDownloads.aspx")

const SYMBOL_HEADER = "Symbol"

const main = async () => {
  await promptUser("Download CSV and then press Enter")
  const unrealizedTaxLotsCsv = await parseCSV(unrealizedPath)
  const unrealizedTaxLots = groupBy(unrealizedTaxLotsCsv, SYMBOL_HEADER)

  const weights = await slickCharts.fetch()

  metaWriteOut({
    myStocks: mapValues(unrealizedTaxLots, (csvRows, ticker) => ({
      my_costBasis: getUnrealizedCostBasis(csvRows),
      my_shares: getUnrealizedShares(csvRows),
      sp_weight: weights[ticker] || "0",
    })),
  })
}

main()
