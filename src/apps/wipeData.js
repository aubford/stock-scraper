const { writeOut, readJsonFile, promptForYes, writeJsonFile } = require("../util")

const app = async () => {
  const isVoo = await promptForYes("Is VOO?")
  const fileLocation = isVoo ? VOO_LOCATION : STOCK_DATA_LOCATION

  writeJsonFile(fileLocation, {})
}

module.exports = async () =>
  app()
    .then(() => {
      console.log("✨ Data wiped ✨")
    })
    .catch(err => console.error("Error:", err))
