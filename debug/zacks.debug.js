require("../globalEnv")
const { zacks } = require("../src/sources")

const ticker = "AAPL"

zacks
  .fetch(ticker)
  .then(res => {
    console.log(res)
  })
  .catch(err => console.error(err))
