const { fetchWSJData } = require("../src/api")
const { promptUser, writeFile } = require("../src/util")

async function run() {
  const ticker = await promptUser("Ticker: ")
  const data = await fetchWSJData(ticker)
  writeFile(`test/data/${ticker}wsjData.json`, data)
}

run()
