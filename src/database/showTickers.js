const { getStockTickers } = require("../util")

module.exports = () => {
  console.log(getStockTickers().sort())
  console.log("count: " + getStockTickers().length)
}
