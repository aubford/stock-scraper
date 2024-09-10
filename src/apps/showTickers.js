const { getStockTickers, exit } = require("../util")

module.exports = () => {
  console.log(getStockTickers().sort())
  console.log("count: " + getStockTickers().length)
}
