const moment = require("moment")
const { isFunction, mapValues, fromPairs, unionBy, sortBy } = require("lodash")
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

exports.getOwners = (ownershipList, indexFundOwners) => {
  if (!ownershipList) {
    return ""
  }
  const indexFundTags = ["index", "500", "russel", "spdr", "s&p", "nasdaq"]

  return ownershipList
    .filter(owner =>
      indexFundOwners
        ? indexFundTags.some(name => owner.organization.toLowerCase().includes(name))
        : indexFundTags.every(name => !owner.organization.toLowerCase().includes(name))
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

exports.getRecentStatement = (statements, mrq) =>
  mrq && statements
    ? mapValues(statements.find(({ endDate: { fmt } }) => fmt === mrq.fmt) || {}, "raw")
    : {}

exports.reduceUpdownGrade = upgradeDowngradeHistory =>
  sortBy(upgradeDowngradeHistory, "epochGradeDate")
    .reverse()
    .reduce((acc, { firm, toGrade, fromGrade }) => {
      return acc + ` ${firm}: ${fromGrade} => ${toGrade}\n`
    }, "")

const isObj = value => typeof value === "object" && value !== null

const keySet = objArr => unionBy(...objArr.map(Object.keys))
const getNum = (val, key) => (isObj(val) ? val[key] : val) || 0

exports.getStatementCharts = (statementSet, name = "Chart") =>
  statementSet
    ? fromPairs(
        keySet(statementSet).map(key => [
          key + name,
          statementSet
            .map(statement =>
              key === "endDate" ? getNum(statement[key], "fmt") : getNum(statement[key], "raw")
            )
            .reverse(),
        ])
      )
    : {}

const orZero = (...args) => {
  const [conditionVal, value] = args
  try {
    const conditionValRes = isFunction(conditionVal) ? conditionVal() : conditionVal
    if (args.length === 1) {
      return conditionValRes && conditionValRes !== Infinity ? conditionValRes : 0
    }
    if (conditionValRes) {
      const valueRes = isFunction(value) ? value() : value
      return valueRes === Infinity ? 0 : valueRes
    }
    return 0
  } catch (err) {
    return 0
  }
}

exports.orZero = orZero
exports.raw = value => orZero(() => value.raw)
exports.fmt = value => orZero(() => value.fmt)

exports.allDatesAreFuture = dateArr =>
  dateArr && dateArr.every(({ fmt }) => moment(fmt).isAfter())

exports.YAHOO_MODULES = [
  "assetProfile",
  "balanceSheetHistory",
  "balanceSheetHistoryQuarterly",
  "calendarEvents",
  "cashflowStatementHistory",
  "cashflowStatementHistoryQuarterly",
  "defaultKeyStatistics",
  "earnings",
  "earningsHistory",
  "earningsTrend",
  "esgScores",
  "financialData",
  "fundOwnership",
  "fundPerformance",
  "fundProfile",
  "incomeStatementHistory",
  "incomeStatementHistoryQuarterly",
  "indexTrend",
  "industryTrend",
  "insiderHolders",
  "insiderTransactions",
  "institutionOwnership",
  "majorDirectHolders",
  "majorHoldersBreakdown",
  "netSharePurchaseActivity",
  "price",
  "recommendationTrend",
  "secFilings",
  "sectorTrend",
  "summaryDetail",
  "summaryProfile",
  "topHoldings",
  "upgradeDowngradeHistory",
] 