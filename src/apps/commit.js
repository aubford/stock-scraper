const { writeOut, readJsonFile, promptForYes } = require("../util")

const app = async () => {
  const isVoo = await promptForYes("Is VOO?")
  const newDataToWrite = readJsonFile(isVoo ? VOO_DATA_STAGING : STOCK_DATA_STAGING)
  const fileLocation = isVoo ? VOO_LOCATION : STOCK_DATA_LOCATION

  const mergeRes = await promptForYes("Merge new data with existing data for each ticker?")
  writeOut(fileLocation, newDataToWrite, mergeRes)
}

module.exports = async () =>
  app()
    .then(() => {
      console.log("✨ Commit successful! ✨")
    })
    .catch(err => console.error("Error:", err))
