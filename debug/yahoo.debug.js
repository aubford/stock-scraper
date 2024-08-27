require("../globalEnv")
const { yahoo } = require("../src/sources")

const ticker = "SNOW"

const run = async () => {
  await yahoo.fetchVooIndexHistoricalPrices(true)
  const res = await yahoo.fetch(ticker).catch(err => {
    console.error(err)
  })
  return res
}

run().then(console.log)
