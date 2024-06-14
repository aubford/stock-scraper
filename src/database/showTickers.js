const { getStockTickers } = require("../util")

console.log(getStockTickers().sort())
console.log('count: ' + getStockTickers().length)
