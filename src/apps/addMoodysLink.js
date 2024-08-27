// UNTESTED!
const { promptUser, promptForYes, readJsonFile, writeJsonFile } = require("../util")

const app = async () => {
  const ticker = await promptUser("Ticker: ")
  const moodysLink = await promptUser("Link: ")
  const isVoo = await promptForYes("VOO?")

  if (isVoo) {
    const vooData = readJsonFile(VOO_LOCATION)
    vooData[ticker] = {
      ...vooData[ticker],
      moodysLink,
    }
    writeJsonFile(VOO_LOCATION, vooData)
  } else {
    const stockData = readJsonFile(STOCK_DATA_LOCATION)
    stockData[ticker] = {
      ...stockData[ticker],
      moodysLink,
    }
    writeJsonFile(STOCK_DATA_LOCATION, stockData)
  }
}

app()
