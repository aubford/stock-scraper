const { mapValues, groupBy } = require("lodash")

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

const earningsDates = stockData =>
  mapValues(
    groupBy(stockData, stock => {
      if (stock.zacksExpectedReportDate) {
        const spl = stock.zacksExpectedReportDate.split("/")
        return [spl[2], spl[0], spl[1]].join("-")
      }
      return stock.earningsDates
    }),
    stocks => stocks.map(stock => stock.ticker) /*?*/
  )

module.exports = {
  sectorIndexWithDesc,
  sectorIndex,
  getTickers,
  getDesc,
  earningsDates,
}
