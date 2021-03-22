const { fromPairs, unionBy, sortBy } = require("lodash")
exports.maxSecondsInQuarter = 8121600
exports.secondsInYear = 525600 * 60

exports.selectValueTypes = (multiValues, type) =>
  Object.keys(multiValues).reduce(
    (acc, key) => ({
      ...acc,
      [key]: multiValues[key] ? multiValues[key][type] : 0,
    }),
    {}
  )

exports.annu = val => val * 4

exports.getNonIndexOwners = ownershipList => {
  if (!ownershipList) {
    return ""
  }
  const indexFundTags = ["index", "500", "russel", "spdr", "s&p"]

  return ownershipList
    .filter(owner =>
      indexFundTags.every(name => !owner.organization.toLowerCase().includes(name))
    )
    .map(({ organization, pctHeld }) => `${organization}: ${pctHeld.fmt}`)
    .join("\n")
}

exports.getAnalystRecommendations = recommendationTrend => {
  if (!recommendationTrend) {
    return []
  }
  const { strongSell, sell, hold, buy, strongBuy } = recommendationTrend.find(
    t => t.period === "0m"
  )
  return [strongSell, sell, hold, buy, strongBuy]
}

const addDays = (incomingDate, daysToAdd) => {
  const newDate = new Date(incomingDate)
  return new Date(newDate.setDate(newDate.getDate() + daysToAdd))
}

exports.addDays = addDays

exports.dateStrIsBefore = (dateStr, daysToAdd) =>
  Boolean(new Date(dateStr) < addDays(new Date(), daysToAdd))

exports.validateEarningsChart = (earningsChart, mrq) => {
  if (!earningsChart || !earningsChart.quarterly.some(({ date }) => date === mrq)) {
    return []
  }
  return earningsChart.quarterly
}

exports.getRecentStatement = (statements, seconds) =>
  statements.find(({ endDate }) => endDate && endDate.raw === seconds)

exports.reduceUpdownGrade = upgradeDowngradeHistory =>
  sortBy(upgradeDowngradeHistory, "epochGradeDate")
    .reverse()
    .reduce((acc, { firm, toGrade, fromGrade }) => {
      return acc + ` ${firm}: ${fromGrade} => ${toGrade}\n`
    }, "")

const isObj = value => typeof value === "object" && value !== null

const keySet = objArr => unionBy(...objArr.map(Object.keys))
const getRaw = val => (isObj(val) ? val.raw : val) || 0

exports.getStatementCharts = (statementSet, name = "Chart") =>
  fromPairs(
    keySet(statementSet).map(key => [
      key + name,
      statementSet
        .map(statement =>
          key === "endDate" ? statement[key].fmt || 0 : getRaw(statement[key])
        )
        .reverse(),
    ])
  )
