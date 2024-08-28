const { pickBy, omitBy, isEmpty, mapValues } = require("lodash")
const { promptForVooAndStagingFileLocation, readJsonFile, promptForYes } = require("../util")

const predicateSimple = (value, key) =>
  value && (key.includes("error_") || key.includes("warnError_"))

const predicateVerbose = (value, key) => value && key.toLowerCase().includes("error")

const errorsOnly = (stockData, predicate) => {
  const errorKeys = mapValues(stockData, ticker => pickBy(ticker, predicate))

  return omitBy(errorKeys, isEmpty)
}

const app = async (file, verbose) => {
  const fileLocation = file || (await promptForVooAndStagingFileLocation())
  const isVerbose = verbose || (await promptForYes("Verbose?"))
  return errorsOnly(readJsonFile(fileLocation), isVerbose ? predicateVerbose : predicateSimple)
}

module.exports = () =>
  app().then(res => {
    console.log(res)
  })
