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
const moment = require("moment")
const { greenBright, green, cyan, bgGreen, yellow } = require("chalk")

const { toPairs, merge, sortBy, omit, mapValues, groupBy } = require("lodash")
const stockJson = require("../test/stockData.json")
const stockData = omit(stockJson, ["magicTickers", "buffetData"])

global.getSectorUpdated = () => {
  const updatedIndex = getSectorLastUpdatedIndex(stockData)
  sortBy(toPairs(updatedIndex), 1).forEach(([name, date]) => {
    const nameF = cyan(name.padEnd(22))
    const dateF = yellow(date)
    console.log(nameF, ": ", dateF)
  })
}
global.getEarnings = () => {
  const earningsDates = getEarningsDates(stockData)
  const fourDaysAgo = moment().subtract(5, "days")
  const pairs = toPairs(earningsDates).filter(([date]) => new Date(date) > fourDaysAgo)

  const res = sortBy(pairs, 0)
    .reverse()
    .forEach(([date, tickers]) => {
      const dateF = cyan(date.padEnd(10))
      const tickersF = yellow(tickers.join(", "))
      console.log(dateF, ":", tickersF)
    })
}

//const testData = require("../test/data/dhrData.json")
//const yahooData = testData.quoteSummary.result[0]

//getEarningsDates(stockData) /*?*/
//getUpdateCalendar(stockData) /*?*/
//getSectorIndex(stockData) /*?*/
//getSectorLastUpdatedIndex(stockData) /*?+*/
