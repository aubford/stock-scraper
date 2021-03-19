const { omit, mapValues, groupBy } = require("lodash")
const stockJson = require("../test/stockData.json")
const stockJsonStockData = omit(stockJson, ["magicTickers", "buffetData"])

const getFirstSentence = str =>
  str ? str.slice(0, 50) + str.slice(50).split(". ")[0] : null

const sectorIndexWithDesc = stockData =>
  mapValues(groupBy(stockData, "sector"), sector =>
    mapValues(groupBy(sector, "industry"), industry =>
      industry.map(({ ticker, longBusinessSummary }) => [
        ticker,
        getFirstSentence(longBusinessSummary),
      ])
    )
  )

const sectorIndex = stockData =>
  mapValues(groupBy(stockData, "sector"), sector =>
    mapValues(groupBy(sector, "industry"), industry =>
      industry.map(({ ticker }) => ticker)
    )
  )

const getTickers = stockData => Object.keys(stockData)

const getDesc = stockData =>
  mapValues(stockData, ({ longBusinessSummary }) => getFirstSentence(longBusinessSummary))

//getDesc(stockJsonStockData) /* ?+*/
sectorIndex(stockJsonStockData) /* ?+*/

module.exports = {
  sectorIndexWithDesc,
  sectorIndex,
  getTickers,
  getDesc,
}
