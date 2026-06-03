require("../globalEnv")
const extra = require("./apps/extra")
const csv = require("./apps/csv")
const analysis = require("./apps/analysis")
const fetchSPWeights = require("./apps/fetchSPWeights")

const main = async () => {
  console.log("🚀 Starting all 🚀")
  console.log("🚀 DONT FORGET TO LAUNCH BROWSER!!! 🚀")
  await extra()
  await fetchSPWeights()
  await csv()
  await analysis()
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
