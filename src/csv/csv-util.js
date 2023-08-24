const fs = require("fs")
const path = require("path")
const { round, omit, flatten } = require("lodash")
const os = require("os")
const csv = require("csv-parser")
const { parseCommaFloat } = require("../util")

const HOLDINGS = "Holdings"
const UNREALIZED_GAIN_LOSS_TAX_LOTS = "UnrealizedGainLossTaxLots"
const UNREALIZED_GAIN_LOSS_SUMMARY = "UnrealizedGainLossSummary"
const REALIZED_GAIN_LOSS_TAX_LOTS = "RealizedGainLossTaxLots"
const EXPORT_DATA = "ExportData"
const downloadsPath = path.join(os.homedir(), "Downloads")

const renameFile = (baseName, directoryPath) => {
  // read directory
  fs.readdir(directoryPath, function (err, files) {
    if (err) {
      return console.log("Unable to scan directory: " + err)
    }

    // iterate over files
    files.forEach(function (file) {
      // create a dynamic regular expression to match the baseName with trailing numbers and .csv extension
      let pattern = new RegExp(`^${baseName}.+.csv$`)

      // check if file name matches pattern
      if (file.match(pattern)) {
        // construct new file name
        let newFilePath = path.join(directoryPath, baseName + ".csv")

        // rename file
        fs.rename(path.join(directoryPath, file), newFilePath, function (err) {
          if (err) console.log("ERROR: " + err)
        })

        console.log(`Renamed file ${file} to ${baseName}`)
      }
    })
  })
}

const renameCSVs = () => {
  renameFile(HOLDINGS, downloadsPath)
  renameFile(UNREALIZED_GAIN_LOSS_TAX_LOTS, downloadsPath)
  renameFile(UNREALIZED_GAIN_LOSS_SUMMARY, downloadsPath)
  renameFile(REALIZED_GAIN_LOSS_TAX_LOTS, downloadsPath)
  renameFile(EXPORT_DATA, downloadsPath)
}

/**
 * @param filePath
 * @returns {Promise<*>}
 */
async function parseCSV(filePath) {
  const results = []

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", data => {
        results.push(data)
      })
      .on("end", () => {
        resolve(results)
      })
      .on("error", error => {
        reject(error)
      })
  })
}

const sumBy = (arr, key) => {
  return arr.reduce((acc, curr) => {
    return acc + parseCommaFloat(curr[key])
  }, 0)
}

const getUnrealizedCostBasis = csvRows => {
  const [res] = csvRows.reduce(
    ([mean, units], curr) => {
      const thisBasis = parseCommaFloat(curr["Cost Basis ($)"]) || 0
      const thisUnits = thisBasis ? parseCommaFloat(curr["Quantity"]) : 0
      const total = mean * units + thisBasis
      const newMean = total / (units + thisUnits)
      return [newMean, units + thisUnits]
    },
    [0, 0]
  )

  return round(res, 2)
}

const getUnrealizedShares = csvRows => {
  const validSharesRows = csvRows.filter(row => row["Acquisition Date"] !== "Reinvestments")
  const valueSum = sumBy(validSharesRows, "Quantity")
  return round(valueSum, 2)
}

const getPortfolioStocksTotalValue = unrealizedTaxLots => {
  const portfolioStocks = omit(unrealizedTaxLots, ["VTI", "VOO", "RSP"])
  const portfolioRows = flatten(Object.values(portfolioStocks))
  const totalValue = sumBy(portfolioRows, "Value ($)")
  return round(totalValue, 2)
}

module.exports = {
  renameFile,
  renameCSVs,
  getUnrealizedCostBasis,
  getUnrealizedShares,
  unrealizedPath: path.join(downloadsPath, UNREALIZED_GAIN_LOSS_TAX_LOTS + ".csv"),
  downloadsPath,
  getPortfolioStocksTotalValue,
  parseCSV,
  sumBy,
}
