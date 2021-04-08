//noinspection JSUnusedLocalSymbols
//noinspection BadExpressionStatementJS
/* eslint-disable no-unused-vars */
const {
  getSectorIndexWithDesc,
  getIndustryIndex,
  getSectorIndex,
  getTickers,
  getDesc,
  getEarningsDates,
  sectorMap,
} = require("./introspectStockData")
const { toPairs, merge, sortBy, omit, mapValues, groupBy } = require("lodash")
const stockJson = require("../test/stockData.json")
const stockData = omit(stockJson, ["magicTickers", "buffetData"])

const testData = require("../test/data/rtxData.json")
const yahooData = testData.quoteSummary.result[0]

stockData["TTD"] /*?*/
