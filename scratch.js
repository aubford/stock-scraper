const _ = require("lodash")
const fs = require("fs")
const readline = require("readline")

const SCRAPBOOK_LOCATION = "/Users/aubrey/Google Drive/stock-scrapbook"
const stockDataLocation = `${SCRAPBOOK_LOCATION}/stockData.json`


const run = async () => {
  console.log("********************* HIT ******************")
  await new Promise(resolve => setTimeout(resolve, 3000))
  console.log("********************* HIT ******************")
}

run()
