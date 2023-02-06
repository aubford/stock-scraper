require("../preload")
const { wsj } = require("../src/api")

const ticker = "AAPL"

wsj
  .fetch(ticker)
  .then(res => {
    console.log(res)
  })
  .catch(err => console.error(err))
