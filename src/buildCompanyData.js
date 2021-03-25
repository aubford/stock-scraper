const { mapValues, last, sum } = require("lodash")
const {
  maxSecondsInQuarter,
  secondsInYear,
  addDays,
  selectValueTypes,
  annu,
  getNonIndexOwners,
  getAnalystRecommendations,
  getRecentStatement,
  reduceUpdownGrade,
  dateStrIsBefore,
  getStatementCharts,
  orZero,
  raw,
  fmt,
  allDatesAreFuture,
} = require("./buildCompanyDataUtil")

const validateEarningsTrend = trend => {
  if (!trend) {
    return {}
  }

  const endDatePlusDaysToReport = addDays(trend[0].endDate, 55)
  const now = new Date()
  if (endDatePlusDaysToReport < now) {
    return {}
  }

  const {
    0: {
      // Estimates for this Quarter-end earnings
      epsTrend: {
        current: currentEpsEstimate,
        "7daysAgo": weekEpsEstimate,
        "30daysAgo": monthEpsEstimate,
        "60daysAgo": monthsEpsEstimate,
        "90daysAgo": quarterEpsEstimate,
      } = {},
      revenueEstimate: {
        avg: revenueEstimateAvg,
        low: revenueEstimateLow,
        high: revenueEstimateHigh,
        growth: revenueEstimateGrowth,
      } = {},
      growth: earningsEstimateGrowth,
    } = {},
    1: {
      // Estimates for +1 Quarter earnings
      epsTrend: {
        current: currentEpsEstimateFollowingQuarter,
        "7daysAgo": weekEpsEstimateFollowingQuarter,
        "30daysAgo": monthEpsEstimateFollowingQuarter,
        "60daysAgo": monthsEpsEstimateFollowingQuarter,
        "90daysAgo": quarterEpsEstimateFollowingQuarter,
      } = {},
      revenueEstimate: {
        avg: revenueEstimateFollowingQuarterAvg,
        low: revenueEstimateFollowingQuarterLow,
        high: revenueEstimateFollowingQuarterHigh,
        growth: revenueEstimateFollowingQuarterGrowth,
      } = {},
      growth: earningsEstimateFollowingQuarterGrowth,
    } = {},
    3: {
      // Estimates for year-end earnings
      epsTrend: {
        current: currentEpsEstimateNextYear,
        "7daysAgo": weekEpsEstimateNextYear,
        "30daysAgo": monthEpsEstimateNextYear,
        "60daysAgo": monthsEpsEstimateNextYear,
        "90daysAgo": quarterEpsEstimateNextYear,
      } = {},
      revenueEstimate: {
        avg: revenueEstimateNextYearAvg,
        low: revenueEstimateNextYearLow,
        high: revenueEstimateNextYearHigh,
        growth: revenueEstimateNextYearGrowth,
      } = {},
      growth: earningsEstimateNextYearGrowth,
    } = {},
  } = trend

  return {
    currentEpsEstimate,
    weekEpsEstimate,
    monthEpsEstimate,
    monthsEpsEstimate,
    quarterEpsEstimate,
    revenueEstimateAvg,
    revenueEstimateLow,
    revenueEstimateHigh,
    revenueEstimateGrowth,
    earningsEstimateGrowth,
    currentEpsEstimateFollowingQuarter,
    weekEpsEstimateFollowingQuarter,
    monthEpsEstimateFollowingQuarter,
    monthsEpsEstimateFollowingQuarter,
    quarterEpsEstimateFollowingQuarter,
    revenueEstimateFollowingQuarterAvg,
    revenueEstimateFollowingQuarterLow,
    revenueEstimateFollowingQuarterHigh,
    revenueEstimateFollowingQuarterGrowth,
    earningsEstimateFollowingQuarterGrowth,
    currentEpsEstimateNextYear,
    weekEpsEstimateNextYear,
    monthEpsEstimateNextYear,
    monthsEpsEstimateNextYear,
    quarterEpsEstimateNextYear,
    revenueEstimateNextYearAvg,
    revenueEstimateNextYearLow,
    revenueEstimateNextYearHigh,
    revenueEstimateNextYearGrowth,
    earningsEstimateNextYearGrowth,
  }
}

const cleanShortInterest = (
  dateShortInterest,
  sharesShortPreviousMonthDate,
  sharesShortPriorMonth,
  shortPercentOfFloat,
  sharesShort
) => {
  if (!sharesShort || !sharesShortPriorMonth || !shortPercentOfFloat) {
    return {}
  }
  if (
    dateStrIsBefore(dateShortInterest.fmt, -45) ||
    dateStrIsBefore(sharesShortPreviousMonthDate.fmt, -75)
  ) {
    return {}
  }

  return {
    sharesShortPriorMonth: sharesShortPriorMonth.raw,
    sharesShort: sharesShort.raw,
    shortPercentOfFloat: shortPercentOfFloat.raw,
  }
}

const getUpgradeDowngradeHistory = upgradeDowngradeHistory => {
  const filterDoubles = upgradeDowngradeHistory.filter(({ firm, epochGradeDate }) =>
    upgradeDowngradeHistory.every(
      comparison =>
        firm !== comparison.firm || epochGradeDate >= comparison.epochGradeDate
    )
  )

  const nowInSeconds = Date.now() / 1000
  const quarterAgoSeconds = nowInSeconds - maxSecondsInQuarter
  const prevQuarterAgoSeconds = nowInSeconds - maxSecondsInQuarter * 2
  const yearAgoSeconds = nowInSeconds - secondsInYear

  const pastQuarter = filterDoubles.filter(
    ({ epochGradeDate }) => epochGradeDate >= quarterAgoSeconds
  )
  const prevQuarter = filterDoubles.filter(
    ({ epochGradeDate }) =>
      epochGradeDate < quarterAgoSeconds && epochGradeDate >= prevQuarterAgoSeconds
  )
  const restOfYear = filterDoubles.filter(
    ({ epochGradeDate }) =>
      epochGradeDate < prevQuarterAgoSeconds && epochGradeDate >= yearAgoSeconds
  )

  return (
    reduceUpdownGrade(pastQuarter) +
    "_____-1 Qtr_____\n" +
    reduceUpdownGrade(prevQuarter) +
    "_____-2 Qtr_____\n" +
    reduceUpdownGrade(restOfYear)
  )
}

/**
 * @param quoteSummary
 * @param wsjChart
 * @param wsjData
 * @returns {CompanyData}
 */
module.exports = ({ quoteSummary }, { wsjChart, ...wsjData }) => {
  const {
    assetProfile: {
      longBusinessSummary,
      auditRisk,
      boardRisk,
      compensationRisk,
      shareHolderRightsRisk,
      overallRisk,
      sector,
      industry,
      country,
    } = {},
    recommendationTrend: { trend: recommendationTrend } = {},
    defaultKeyStatistics: {
      beta, // "Beta (5Y Monthly)"
      bookValue, // "Book Value Per Share (mrq)"
      earningsQuarterlyGrowth, // "Quarterly Earnings Growth (yoy)"
      enterpriseToRevenue,
      enterpriseToEbitda,
      enterpriseValue,
      floatShares,
      forwardEps,
      forwardPE,
      heldPercentInsiders,
      heldPercentInstitutions,
      lastDividendDate,
      lastDividendValue,
      lastFiscalYearEnd,
      nextFiscalYearEnd,
      mostRecentQuarter,
      netIncomeToCommon, // TTM
      pegRatio,
      priceToBook,
      profitMargins, // probably TMM
      sharesOutstanding,
      sharesPercentSharesOut, // "Short % of Shares Outstanding"
      sharesShort,
      dateShortInterest,
      sharesShortPreviousMonthDate,
      sharesShortPriorMonth,
      shortPercentOfFloat,
      shortRatio,
      trailingEps, // current EPS
    } = {},
    fundOwnership: { ownershipList } = {},
    summaryDetail: {
      dividendRate, // "Forward Dividend
      dividendYield, // & Yield"
      exDividendDate,
      fiftyDayAverage,
      fiveYearAvgDividendYield,
      trailingAnnualDividendRate,
      trailingAnnualDividendYield,
      trailingPE, // "PE Ratio (TTM)"
      payoutRatio,
      priceToSalesTrailing12Months,
      regularMarketVolume,
      twoHundredDayAverage,
    } = {},
    majorHoldersBreakdown: { institutionsCount } = {},
    calendarEvents: {
      earnings: {
        earningsAverage,
        earningsLow,
        earningsHigh,
        revenueAverage,
        revenueLow,
        revenueHigh,
        earningsDate,
      } = {}, // upcoming quarter-end projections
    } = {},
    earnings: {
      earningsChart: {
        currentQuarterEstimate,
        currentQuarterEstimateDate,
        currentQuarterEstimateYear,
        earningsDate: earningsChartCurrentEstimateDates,
        quarterly: quarterlyEarningsChart,
      } = {},
      financialsChart: { quarterly: quarterlyFinancialsChart } = {},
    } = {},
    earningsTrend: { trend } = {},
    financialData: {
      totalRevenue,
      revenuePerShare,
      returnOnAssets,
      returnOnEquity,
      grossProfits,
      ebitda,
      grossMargins,
      ebitdaMargins,
      quickRatio,
      currentRatio,
      freeCashflow: leveredFreeCashFlow,
      currentPrice,
      targetHighPrice,
      targetLowPrice,
      targetMeanPrice,
      recommendationKey,
      numberOfAnalystOpinions,
      totalCash,
      totalCashPerShare,
      totalDebt, //  Total Debt MRQ from "statistics" page
      operatingCashflow: operatingCashflowTTM, // verified this is TTM from Schwab cash flow statement
      earningsGrowth,
      revenueGrowth, // Quarterly Revenue Growth (yoy)
      operatingMargins, // TTM
    } = {},
    upgradeDowngradeHistory: { history: upgradeDowngradeHistory } = {},
    price: { regularMarketPrice },
    balanceSheetHistory: { balanceSheetStatements: balanceSheetStatementsAnnu } = {},
    cashflowStatementHistory: { cashflowStatements: cashflowStatementsAnnu } = {},
    incomeStatementHistory: { incomeStatementHistory: incomeStatementsAnnu } = {},
    cashflowStatementHistoryQuarterly: { cashflowStatements },
    incomeStatementHistoryQuarterly: { incomeStatementHistory },
    balanceSheetHistoryQuarterly: { balanceSheetStatements },
  } = quoteSummary.result[0]

  /** @type CashFlowCharts */
  const cashflowChartsAnnu = getStatementCharts(cashflowStatementsAnnu, "CfAnnuChart")
  /** @type CashFlowCharts */
  const cashflowCharts = getStatementCharts(cashflowStatements, "CfQuartChart")
  /** @type IncomeCharts */
  const incomeChartsAnnu = getStatementCharts(incomeStatementsAnnu, "IsAnnuChart")
  /** @type IncomeCharts */
  const incomeCharts = getStatementCharts(incomeStatementHistory, "IsQuartChart")
  /** @type BalanceSheetCharts */
  const balSheetChartsAnnu = getStatementCharts(balanceSheetStatementsAnnu, "BsAnnuChart")
  /** @type BalanceSheetCharts */
  const balSheetCharts = getStatementCharts(balanceSheetStatements, "BsQuartChart")

  /** @type BalanceSheet */
  const balanceSheet = getRecentStatement(balanceSheetStatements, mostRecentQuarter)
  /** @type IncomeStatement */
  const incomeStatement = getRecentStatement(incomeStatementHistory, mostRecentQuarter)
  /** @type CashFlows */
  const cashFlows = getRecentStatement(cashflowStatements, mostRecentQuarter)

  // ------------------------------- //

  const {
    currentEpsEstimate,
    weekEpsEstimate,
    monthEpsEstimate,
    monthsEpsEstimate,
    quarterEpsEstimate,
    revenueEstimateAvg,
    revenueEstimateLow,
    revenueEstimateHigh,
    revenueEstimateGrowth,
    earningsEstimateGrowth,
    currentEpsEstimateFollowingQuarter,
    weekEpsEstimateFollowingQuarter,
    monthEpsEstimateFollowingQuarter,
    monthsEpsEstimateFollowingQuarter,
    quarterEpsEstimateFollowingQuarter,
    revenueEstimateFollowingQuarterAvg,
    revenueEstimateFollowingQuarterLow,
    revenueEstimateFollowingQuarterHigh,
    revenueEstimateFollowingQuarterGrowth,
    earningsEstimateFollowingQuarterGrowth,
    currentEpsEstimateNextYear,
    weekEpsEstimateNextYear,
    monthEpsEstimateNextYear,
    monthsEpsEstimateNextYear,
    quarterEpsEstimateNextYear,
    revenueEstimateNextYearAvg,
    revenueEstimateNextYearLow,
    revenueEstimateNextYearHigh,
    revenueEstimateNextYearGrowth,
    earningsEstimateNextYearGrowth,
  } = validateEarningsTrend(trend)

  const slicePerShare = val => orZero(() => val / sharesOutstanding.raw)
  const slicePerShareAnnlz = val => orZero(() => annu(val) / sharesOutstanding.raw)

  const statementDataOk =
    [
      cashflowCharts.endDateCfQuartChart,
      balSheetCharts.endDateBsQuartChart,
      incomeCharts.endDateIsQuartChart,
    ].every(chart => last(chart) === fmt(mostRecentQuarter)) &&
    [cashflowStatements, balanceSheetStatements, incomeStatementHistory].every(
      statement => statement.length === 4
    ) &&
    (cashflowCharts.capitalExpendituresCfQuartChart || []).every(num => num <= 0)

  const earningsChartDataOk = !!(
    quarterlyEarningsChart &&
    quarterlyFinancialsChart &&
    quarterlyFinancialsChart.length === 4 &&
    quarterlyEarningsChart.length === 4 &&
    currentQuarterEstimateDate &&
    currentQuarterEstimateYear &&
    earningsChartCurrentEstimateDates &&
    earningsChartCurrentEstimateDates.length > 0 &&
    quarterlyFinancialsChart[0].date ===
      currentQuarterEstimateDate + (currentQuarterEstimateYear - 1)
  )

  const mTotalDebt =
    raw(totalDebt) ||
    orZero(balanceSheet.totalCurrentLiabilities) +
      orZero(balanceSheet.longTermDebt) +
      orZero(balanceSheet.shortLongTermDebt)

  const operatingCashFlowMRQ = orZero(annu(cashFlows.totalCashFromOperatingActivities))
  const freeCashFlowMRQ = orZero(
    annu(cashFlows.totalCashFromOperatingActivities + cashFlows.capitalExpenditures)
  )
  const freeCashFlowTTM = orZero(statementDataOk, () =>
    sum([
      ...cashflowCharts.capitalExpendituresCfQuartChart,
      ...cashflowCharts.totalCashFromOperatingActivitiesCfQuartChart,
    ])
  )

  const statementTotalRevenueSum = orZero(statementDataOk, () =>
    sum(incomeCharts.totalRevenueIsQuartChart)
  )
  const totalRevenueTTM = raw(totalRevenue) || statementTotalRevenueSum

  const cashFlowReStock = -(
    orZero(cashFlows.issuanceOfStock) + orZero(cashFlows.repurchaseOfStock)
  )

  const anaylstRecommendations = getAnalystRecommendations(recommendationTrend)

  const statementData = {
    ...cashFlows,
    ...cashflowChartsAnnu,
    ...cashflowCharts,
    ...incomeStatement,
    ...incomeChartsAnnu,
    ...incomeCharts,
    ...balanceSheet,
    ...balSheetChartsAnnu,
    ...balSheetCharts,
  }

  const incomeEPSChartAnnu =
    incomeChartsAnnu.netIncomeIsAnnuChart &&
    incomeChartsAnnu.endDateIsAnnuChart[3] === fmt(lastFiscalYearEnd)
      ? incomeChartsAnnu.netIncomeIsAnnuChart.map(fy => slicePerShare(fy))
      : 0

  //noinspection JSValidateTypes
  return {
    ...(statementDataOk ? statementData : mapValues(statementData, () => 0)),
    ...selectValueTypes(
      // RAW //
      {
        // PRICE //

        regularMarketPrice,

        // FINANCIAL DATA

        currentPrice,
        grossProfits,
        revenuePerShare,
        totalCash,
        ebitda,
        operatingCashflowTTM,
        leveredFreeCashFlow,

        // DEFAULT KEY STATISTICS

        floatShares,
        enterpriseValue,
        forwardEps,
        heldPercentInsiders,
        netIncomeToCommon,
        sharesOutstanding,
        trailingEps,

        // CALENDAR EVENTS //

        earningsAverage, // upcoming quarter-end projection
        earningsHigh, // upcoming quarter-end projection
        earningsLow, // upcoming quarter-end projection
        revenueAverage, // upcoming quarter-end projection
        revenueHigh, // upcoming quarter-end projection
        revenueLow, // upcoming quarter-end projection

        // SUMMARY DETAIL //

        twoHundredDayAverage,
        fiftyDayAverage,

        // ANALYSTS

        numberOfAnalystOpinions,
        targetHighPrice,
        targetLowPrice,
        targetMeanPrice,

        // DIVIDEND

        trailingAnnualDividendRate,
        fiveYearAvgDividendYield,
        dividendRate,
        lastDividendValue,

        // EARNINGS TREND

        currentEpsEstimate, //  estimate for this quater results; as of now
        currentEpsEstimateFollowingQuarter, // estimate for following quater results; as of now
        currentEpsEstimateNextYear, // estimate for following year results; as of now
        weekEpsEstimate,
        weekEpsEstimateFollowingQuarter,
        weekEpsEstimateNextYear,
        monthEpsEstimate,
        monthEpsEstimateFollowingQuarter,
        monthEpsEstimateNextYear,
        monthsEpsEstimate, // estimate for this quater results; 2 months ago
        monthsEpsEstimateFollowingQuarter, // estimate for following quater results; 2 months ago
        monthsEpsEstimateNextYear, // estimate for following year results; 2 months ago
        quarterEpsEstimate,
        quarterEpsEstimateFollowingQuarter,
        quarterEpsEstimateNextYear,

        // REVENUE ESTIMATES (All "as of now")

        revenueEstimateLow, // estimate for this quarter revenue
        revenueEstimateAvg,
        revenueEstimateHigh,
        revenueEstimateFollowingQuarterLow, // estimate for following quarter revenue
        revenueEstimateFollowingQuarterAvg,
        revenueEstimateFollowingQuarterHigh,
        revenueEstimateNextYearLow, // estimate for next year revenue
        revenueEstimateNextYearAvg,
        revenueEstimateNextYearHigh,
      },
      "raw"
    ),
    ...selectValueTypes(
      // FORMATTED //
      {
        // INFO //

        mostRecentQuarter,
        lastFiscalYearEnd,
        nextFiscalYearEnd,
        regularMarketVolume,

        // DIVIDEND //

        dividendYield,
        exDividendDate,
        trailingAnnualDividendYield,
        lastDividendDate,
        payoutRatio,

        // VALUATION //

        priceToBook,
        priceToSalesTrailing12Months,
        forwardPE,
        trailingPE,
        pegRatio,
        enterpriseToEbitda,

        // FUNDAMENTALS //

        profitMargins, // probably TTM
        returnOnAssets,
        returnOnEquity,
        beta,
        earningsGrowth,
        revenueGrowth, // Quarterly Revenue Growth (yoy)
        bookValue,
        quickRatio,
        currentRatio,
        grossMargins,
        ebitdaMargins,

        // MARKET SENTIMENT //

        heldPercentInstitutions,
        sharesPercentSharesOut,
        shortPercentOfFloat,
        shortRatio,

        // EARNINGS/REVENUE //

        earningsDate,
        earningsQuarterlyGrowth,
        revenueEstimateGrowth, // estimated revenue growth (YoY) for this quarter
        revenueEstimateFollowingQuarterGrowth,
        revenueEstimateNextYearGrowth, // estimated revenue growth (YoY) for next year
        earningsEstimateGrowth, // estimated earnings growth (YoY) for this quarter
        earningsEstimateFollowingQuarterGrowth,
        earningsEstimateNextYearGrowth, // estimated earnings growth (YoY) for next year
        dateShortInterest,
        sharesShortPreviousMonthDate,
      },
      "fmt"
    ),
    ...cleanShortInterest(
      dateShortInterest,
      sharesShortPreviousMonthDate,
      sharesShortPriorMonth,
      shortPercentOfFloat,
      sharesShort
    ),
    auditRisk,
    boardRisk,
    compensationRisk,
    country,
    industry,
    longBusinessSummary,
    overallRisk,
    recommendationKey,
    sector,
    shareHolderRightsRisk,
    totalRevenueTTM,
    totalDebt: mTotalDebt,
    payoutRatioMRQ: orZero(-(cashFlows.dividendsPaid / cashFlows.netIncome)),
    percentRepurchasedMRQ: orZero(
      () => cashFlowReStock / fiftyDayAverage.raw / sharesOutstanding.raw
    ),
    buybackRatio: cashFlows.netIncome > 0 ? cashFlowReStock / cashFlows.netIncome : "n/a", // validated this data w/ other brokerages
    debtToCapital: mTotalDebt / (mTotalDebt + balanceSheet.totalStockholderEquity),
    operatingMarginTTM:
      raw(operatingMargins) ||
      orZero(
        sum(incomeCharts.ebitIsQuartChart) / sum(incomeCharts.totalRevenueIsQuartChart)
      ),
    salesPerShareMRQ: incomeStatement.totalRevenue
      ? slicePerShareAnnlz(incomeStatement.totalRevenue).toFixed(2)
      : 0,
    salesPerShareTTM: slicePerShare(totalRevenueTTM),
    leveredFreeCashFlowPerShare: slicePerShare(raw(leveredFreeCashFlow)),
    freeCashFlowPerShareTTM: slicePerShare(freeCashFlowTTM),
    freeCashFlowPerShareMRQ: slicePerShare(freeCashFlowMRQ),
    totalCashPerShare: raw(totalCashPerShare),
    operatingCashFlowPerShareMRQ: slicePerShare(operatingCashFlowMRQ),
    enterpriseToRevenue:
      raw(enterpriseToRevenue) || orZero(raw(enterpriseValue) / totalRevenueTTM),
    upgradeDowngradeHistory: upgradeDowngradeHistory
      ? getUpgradeDowngradeHistory(upgradeDowngradeHistory)
      : "n/a",
    anaylstRecommendations,
    numAnaylstRecommendations: anaylstRecommendations.reduce(
      (acc, curr) => acc + curr,
      0
    ),
    institutionsCount: institutionsCount ? institutionsCount.longFmt : 0,
    nonIndexOwners: getNonIndexOwners(ownershipList),
    earningsDates:
      earningsChartCurrentEstimateDates && earningsChartCurrentEstimateDates[0]
        ? earningsChartCurrentEstimateDates.map(({ fmt }) => fmt).join("; ") +
          ` [${currentQuarterEstimateDate + currentQuarterEstimateYear}]`
        : "?",
    currentQuarterEstimateDate,
    currentQuarterEstimateYear,
    dividendChart:
      cashflowChartsAnnu.dividendsPaidCfAnnuChart &&
      cashflowCharts.dividendsPaidCfQuartChart
        ? [
            ...cashflowChartsAnnu.dividendsPaidCfAnnuChart.map(
              payment => Math.abs(payment) / 4
            ),
            0,
            ...cashflowCharts.dividendsPaidCfQuartChart.map(payment => Math.abs(payment)),
          ]
        : 0,
    incomeEPSChartAnnu,
    incomeEPSChartQuart: incomeCharts.netIncomeIsQuartChart
      ? incomeCharts.netIncomeIsQuartChart.map(quart => slicePerShare(quart))
      : 0,
    quarterlyEPSActualEstimateChart: earningsChartDataOk
      ? [
          ...(statementDataOk && incomeEPSChartAnnu
            ? [...incomeEPSChartAnnu.map(fy => fy / 4), 0]
            : []),
          ...quarterlyEarningsChart.reduce(
            (acc, { actual, estimate }) => [...acc, estimate.raw, actual.raw, 0],
            []
          ),
          orZero(
            allDatesAreFuture(earningsChartCurrentEstimateDates),
            raw(currentQuarterEstimate)
          ),
        ]
      : [],
    quarterlyRevenueChart: earningsChartDataOk
      ? [
          ...quarterlyFinancialsChart.map(({ revenue }) => revenue.raw),
          0,
          orZero(allDatesAreFuture(earningsDate), raw(revenueAverage)),
        ]
      : [],
    wsjChartThreeMonthAgo: wsjChart
      .filter((d, idx) => idx % 3 === 0)
      .map(str => Number(str))
      .reverse(),
    wsjChartMonthAgo: wsjChart
      .filter((d, idx) => (idx + 2) % 3 === 0)
      .map(str => Number(str))
      .reverse(),
    wsjChartCurrent: wsjChart
      .filter((d, idx) => (idx + 1) % 3 === 0)
      .map(str => Number(str))
      .reverse(),
    wsjChartCurrentNum: wsjChart
      .filter((d, idx) => (idx + 1) % 3 === 0)
      .reduce((acc, curr) => acc + Number(curr), 0),
    ...wsjData,
    operatingMargins: "deprecated",
    earliestEarningsDate: "deprecated",
    earningsChartDataOk,
    statementDataOk,
  }
}
