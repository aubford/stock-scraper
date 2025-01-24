const { writeOut, deleteFile, readJsonFile, promptForYes } = require("../util")
const fs = require("fs")

const commit = async (isVoo, merge) => {
  const stagingFileLocation = isVoo ? VOO_DATA_STAGING : STOCK_DATA_STAGING

  if (!fs.existsSync(stagingFileLocation)) {
    console.log(`No staging file found at ${stagingFileLocation}. Skipping.`)
    return
  }

  const newDataToWrite = readJsonFile(stagingFileLocation)
  const fileLocation = isVoo ? VOO_LOCATION : STOCK_DATA_LOCATION

  writeOut(fileLocation, newDataToWrite, merge)
  deleteFile(stagingFileLocation, true)
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
