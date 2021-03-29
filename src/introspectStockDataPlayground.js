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

//earningsDates(data) /*?*/
//data["MU"].zacksExpectedReportDate /*?*/
//data["MU"].earningsDates /*?*/

//getDesc(data) /* ?+*/
//sectorIndex(data) /* ?+*/
//data["MU"] /*?+*/
