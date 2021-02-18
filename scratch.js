const _ = require("lodash")
const fs = require("fs")

const SCRAPBOOK_LOCATION = "/Users/aubrey/Google Drive/stock-scrapbook"

const stockDataLocation = `${SCRAPBOOK_LOCATION}/stockData.json`
const currentStockData = fs.readFileSync(stockDataLocation)

const res = JSON.parse(currentStockData)


const keyy = Object.values(res)[0]
