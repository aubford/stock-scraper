require("../../preload")
const {
  sectorMap,
  getEarningsDates,
  getSectorLastUpdatedIndex,
} = require("./introspectStockData")
const moment = require("moment")
const { cyan, yellow } = require("chalk")
const { toPairs, sortBy } = require("lodash")

const stockData = require(STOCK_DATA_LOCATION)

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
  const fourDaysAgo = moment().subtract(10, "days")
  const pairs = toPairs(earningsDates).filter(([date]) => new Date(date) > fourDaysAgo)

  sortBy(pairs, 0)
    .reverse()
    .forEach(([date, tickers]) => {
      const dateF = cyan(date.padEnd(10))
      const tickersF = yellow(tickers.join(", "))
      console.log(dateF, ":", tickersF)
    })
}

global.getSectorMap = () => {
  console.log(Object.fromEntries(sectorMap.entries()))
}
