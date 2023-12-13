require("../preload")
const { wsj } = require("../src/sources")

const ticker = "BAC"

wsj
  .fetch(ticker)
  .then(res => {
    console.log(res)
  })
  .catch(err => {
    console.error(err)
  })
