require("../../preload")
const { fetchBasic } = require("../../src/api/yahoo/index")

const ticker = "VOO"

fetchBasic(ticker)
  .then(res => {
    const parsed = JSON.parse(res)
    console.log(parsed)
  })
  .catch(err => console.error(err))
