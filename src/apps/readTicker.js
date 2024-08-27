const { promptForVooAndStagingFileLocation, promptUser, readJsonFile } = require("../util")

const app = async () => {
  const fileLocation = await promptForVooAndStagingFileLocation()
  const ticker = await promptUser("Ticker: ")
  return readJsonFile(fileLocation)[ticker]
}

app().then(console.log)
