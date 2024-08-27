require("../globalEnv")
const { dataroma } = require("../src/sources")

const ticker = "AAPL"

dataroma
  .fetch(ticker)
  .then(res => {
    console.log(res)
  })
  .catch(err => console.error(err))
