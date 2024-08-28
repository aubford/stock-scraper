const { promptForVooAndStagingFileLocation, promptUser, readJsonFile } = require("../util")

const app = async () => {
  const fileLocation = await promptForVooAndStagingFileLocation()
  const ticker = await promptUser("Ticker: ")
  return readJsonFile(fileLocation)[ticker]
}

module.exports = () => app().then(console.log)
