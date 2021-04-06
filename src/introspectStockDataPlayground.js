//noinspection JSUnusedLocalSymbols
//noinspection BadExpressionStatementJS
/* eslint-disable no-unused-vars */
const {
  sectorIndexWithDesc,
  sectorIndex,
  getTickers,
  getDesc,
  earningsDates,
} = require("./introspectStockData")
const { omit, mapValues, groupBy } = require("lodash")
const stockJson = require("../test/stockData.json")
const data = omit(stockJson, ["magicTickers", "buffetData"])

const testData = require("../test/data/rtxData.json")
const yahooData = testData.quoteSummary.result[0]

//earningsDates(data) /*?*/
//getDesc(data) /* ?+*/
//sectorIndex(data) /* ?+*/
//data["MU"] /*?+*/
