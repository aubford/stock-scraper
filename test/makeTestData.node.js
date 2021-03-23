const { fetchYahooData } = require("../src/api")
const { promptUser, writeFile } = require("../src/util")

async function run() {
  const ticker = await promptUser("Ticker: ")
  const data = await fetchYahooData(ticker)
  writeFile(`test/data/${ticker.toLowerCase()}Data.json`, data)
}

run()
