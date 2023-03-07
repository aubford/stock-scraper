require("../preload")
const { wsj } = require("../src/api")

const ticker = "LMT"

wsj
  .fetch(ticker)
  .then(res => {
    console.log(res)
  })
  .catch(err => {
    console.error(err)
  })
