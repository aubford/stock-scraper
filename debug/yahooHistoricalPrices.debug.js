require("../preload")
const { yahoo } = require("../src/sources")

const ticker = "MRNA"

const run = async () => {
  await yahoo.fetchVooIndexHistoricalPrices(true)

  const res = await yahoo.fetchHistoricalPrices(ticker).catch(err => {
    console.error(err)
  })

  console.log(res)
}

run()
