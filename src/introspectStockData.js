const { mapValues, groupBy } = require("lodash")

const getFirstSentence = str =>
  str ? str.slice(0, 50) + str.slice(50).split(". ")[0] : null

const getSectorIndexWithDesc = stockData =>
  mapValues(groupBy(stockData, "sector"), sector =>
    mapValues(groupBy(sector, "industry"), industry =>
      industry.map(({ ticker, longBusinessSummary }) => [
        ticker,
        getFirstSentence(longBusinessSummary),
      ])
    )
  )

const sectorMap = new Map([
  ["F", "Financial Services"],
  ["C", "Communication Services"],
  ["T", "Technology"],
  ["H", "Healthcare"],
  ["I", "Industrials"],
  ["CC", "Consumer Cyclical"],
  ["CD", "Consumer Defensive"],
  ["U", "Utilities"],
  ["B", "Basic Materials"],
  ["E", "Energy"],
  ["R", "Real Estate"],
])

const getSectorIndex = stockData =>
  mapValues(groupBy(stockData, "sector"), sector => sector.map(({ ticker }) => ticker))

const getIndustryIndex = stockData =>
  mapValues(groupBy(stockData, "sector"), sector =>
    mapValues(groupBy(sector, "industry"), industry =>
      industry.map(({ ticker }) => ticker)
    )
  )

const getTickers = stockData => Object.keys(stockData)

const getDesc = stockData =>
  mapValues(stockData, ({ longBusinessSummary }) => getFirstSentence(longBusinessSummary))

const getEarningsDates = stockData =>
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
  getSectorIndexWithDesc,
  getSectorIndex,
  getIndustryIndex,
  getTickers,
  getDesc,
  getEarningsDates,
  sectorMap,
}
