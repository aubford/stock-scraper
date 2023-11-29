require("../preload")
const { zacks } = require("../src/api")

const ticker = "GILD"

zacks
  .fetch(ticker)
  .then(res => {
    console.log(res)
  })
  .catch(err => console.error(err))
