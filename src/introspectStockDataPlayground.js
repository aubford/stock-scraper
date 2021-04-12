//noinspection JSUnusedLocalSymbols
//noinspection BadExpressionStatementJS
/* eslint-disable no-unused-vars */
const {
  getSectorIndexWithDesc,
  getSectorIndex,
  getIndustryIndex,
  getTickers,
  getDesc,
  getEarningsDates,
  getUpdateCalendar,
  getSectorLastUpdatedIndex,
  sectorMap,
} = require("./introspectStockData")
const { toPairs, merge, sortBy, omit, mapValues, groupBy } = require("lodash")
const stockJson = require("../test/stockData.json")
const stockData = omit(stockJson, ["magicTickers", "buffetData"])

const testData = require("../test/data/rtxData.json")
const yahooData = testData.quoteSummary.result[0]

getSectorLastUpdatedIndex(stockData) /*?*/
getEarningsDates(stockData) /*?*/
getUpdateCalendar(stockData) /*?*/
