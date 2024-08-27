/* eslint-disable */
require("./globalEnv")
const { getStockDataFile, readJsonFile } = require("./src/util")
const _ = require('lodash');  // Add this at the top if not already present

const stockData = getStockDataFile()
const vooData = readJsonFile(VOO_LOCATION)
const stockDataStaging = readJsonFile(STOCK_DATA_STAGING)
const vooDataStaging = readJsonFile(VOO_DATA_STAGING)

const shortEntries = _.pickBy(vooDataStaging["CARR"], (value, key) =>
  key.toLowerCase().includes('short')
)  

shortEntries /* ?+ */


/*
const errorEntries = _.pickBy(vooDataStaging["CARR"], (value, key) =>
  key.toLowerCase().includes('error')
)
*/


