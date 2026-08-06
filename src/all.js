require("../globalEnv")
const extra = require("./apps/extra")
const csv = require("./apps/csv")
const update = require("./apps/update")
const voo = require("./apps/fetchVoo")
const analysis = require("./apps/analysis")
const commit = require("./apps/commit")
const fetchSPWeights = require("./apps/fetchSPWeights")
const { readJsonFile, writeOut, getVooTickers } = require("./util")
const { pickBy } = require("lodash")

const vooTickers = getVooTickers()

// old "all" script: "npm run extra && npm run csv && npm run update && npm run voo && npm run vooB"

const main = async () => {
  console.log("🚀 Starting all 🚀")
  console.log("🚀 DONT FORGET TO LAUNCH BROWSER!!! 🚀")
  await extra()
  await fetchSPWeights()
  await csv()
  // if it hangs here, make sure there aren't other puppeteer processes running
  await update(true)
  const updatedStockData = readJsonFile(STOCK_DATA_STAGING)
  const alreadyFetchedVooTickers = pickBy(updatedStockData, (val, key) =>
    vooTickers.includes(key),
  )
  // overwrite VOO staging with new stock data to avoid redundant scrapes
  writeOut(VOO_DATA_STAGING, alreadyFetchedVooTickers)
  await voo(true)
  await analysis()
  await commit()
}

main()
  .then(() => {
    console.log("Done")
    process.exit(0)
  })
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
