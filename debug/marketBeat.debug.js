require("../globalEnv")
const { marketBeat } = require("../src/sources")

const ticker = "AAPL"

marketBeat
  .fetch(ticker)
  .then(res => {
    console.log(JSON.stringify(res, null, 2))
  })
  .catch(err => console.error(err))
