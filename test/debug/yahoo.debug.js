require("../../preload")
const { yahoo } = require("../../src/api")

const ticker = "VOO"

yahoo
  .fetchHistoricalPrices(ticker)
  .then(res => {
    console.log(res)
  })
  .catch(err => console.error(err))
