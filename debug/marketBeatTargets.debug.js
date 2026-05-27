require("../globalEnv")
const { marketBeatTargets } = require("../src/sources")

const ticker = "AAPL"

marketBeatTargets
  .fetch(ticker)
  .then(res => {
    console.log(JSON.stringify(res, null, 2))
  })
  .catch(err => console.error(err))
