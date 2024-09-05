const { writeOut, readJsonFile, promptForYes } = require("../util")

const commit = async (isVoo, merge) => {
  const newDataToWrite = readJsonFile(isVoo ? VOO_DATA_STAGING : STOCK_DATA_STAGING)
  const fileLocation = isVoo ? VOO_LOCATION : STOCK_DATA_LOCATION

  writeOut(fileLocation, newDataToWrite, merge)
}

const app = async () => {
  console.log("🚀 Commit 🚀")
  const mergeRes = await promptForYes("Merge new data with existing data for each ticker?")
  await commit(false, mergeRes)
  await commit(true, mergeRes)
}

module.exports = async () =>
  app()
    .then(() => {
      console.log("✨ Commit successful! ✨")
    })
    .catch(err => console.error("Error:", err))
