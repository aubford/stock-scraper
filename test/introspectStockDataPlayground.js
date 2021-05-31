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
} = require("../src/introspectStockData")
const { getOnlyStockTickerData } = require("../src/util")
const { isArray, toPairs, merge, sortBy, omit, mapValues, groupBy } = require("lodash")

const stockJson = require("./stockData.json")
const stockData = getOnlyStockTickerData(stockJson)

const testData = require("./data/ryData.json")
const yahooData = testData.quoteSummary.result[0]

const divs = yahooData.cashflowStatementHistoryQuarterly.cashflowStatements.map(
  qtr => qtr.dividendsPaid
)
yahooData.summaryDetail.trailingAnnualDividendRate /*?*/
yahooData.summaryDetail.dividendRate /*?*/

//getEarningsDates(stockData) /*?*/
//getUpdateCalendar(stockData) /*?*/
//getSectorIndex(stockData) /*?*/
//getSectorLastUpdatedIndex(stockData) /*?+*/
