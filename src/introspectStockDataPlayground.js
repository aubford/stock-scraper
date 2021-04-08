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
const { merge, sortBy, omit, mapValues, groupBy } = require("lodash")
const stockJson = require("../test/stockData.json")
const data = omit(stockJson, ["magicTickers", "buffetData"])

const testData = require("../test/data/rtxData.json")
const yahooData = testData.quoteSummary.result[0]

//getEarningsDates(data) /*?*/
//getDesc(data) /* ?+*/
const sectorIndex = getSectorIndex(data)
const sectors = Object.keys(sectorIndex)

const financials = sectorIndex[sectorMap.get("F")] /*?*/

financials.slice(0, Number("asdg")) /*?*/
