try {
  const { webSocketDebuggerUrl } = require("./ws.json")
  global.CONNECTION = {
    browserWSEndpoint: webSocketDebuggerUrl,
    defaultViewport: {
      width: 1400,
      height: 1800,
    },
  }
} catch (err) {
  console.log("skipped ws connection")
}

// Error.stackTraceLimit = 1

const timeoutCoeff = 1

global.SHOULD_MERGE = false

global.PAUSE_MS = 1000 * timeoutCoeff
global.DEFAULT_NAVIGATION_TIMEOUT = 60 * 1000 * timeoutCoeff
global.XPATH_TIMEOUT = 30 * 1000 * timeoutCoeff

global.WSJ_TIMEOUT = 10 * 1000 * timeoutCoeff
global.FIDELITY_ANALYST_TIMEOUT = 25 * 1000 * timeoutCoeff
global.MOODYS_TIMEOUT = 20 * 1000 * timeoutCoeff
global.CFRA_TIMEOUT = 20 * 1000 * timeoutCoeff
global.BOA_TIMEOUT = 10 * 1000 * timeoutCoeff
global.ARGUS_ANALYST_TIMEOUT = 10 * 1000 * timeoutCoeff
global.MORNINGSTAR_TIMEOUT = 20 * 1000 * timeoutCoeff

global.SCRAPBOOK_LOCATION = process.env.STOCK_SCRAPBOOK_LOCATION
global.STOCK_DATA_LOCATION = `${SCRAPBOOK_LOCATION}/stockData.json`
global.VOO_LOCATION = `${SCRAPBOOK_LOCATION}/vooData.json`
global.META_LOCATION = `${SCRAPBOOK_LOCATION}/stockDataMeta.json`
global.STOCK_DATA_BACKUP_LOCATION = `${SCRAPBOOK_LOCATION}/stockDataBackup.json`

Promise.stagger = async (asyncFunc, paramArr, ms) => {
  const staggered = paramArr.map(async (params, idx) => {
    await new Promise(resolve => setTimeout(resolve, idx * ms))
    const normalized = [].concat(params)
    return asyncFunc(...normalized)
  })
  return await Promise.all(staggered)
}

/**
 * @name CashFlows
 * @typedef {{
 *  totalCashFromOperatingActivities: number,
 *  capitalExpenditures: number,
 *  issuanceOfStock: number,
 *  repurchaseOfStock: number,
 *  dividendsPaid: number,
 *  netIncome: number,
 *  repurchaseOfStock: number,
 *  repurchaseOfStock: number,
 * }}
 */

/**
 * @name BalanceSheet
 * @typedef {{
 *   endDate: string,
 *   maxAge: number,
 *   cash: number,
 *   shortTermInvestments: number,
 *   netReceivables: number,
 *   inventory: number,
 *   otherCurrentAssets: number,
 *   totalCurrentAssets: number,
 *   longTermInvestments: number,
 *   propertyPlantEquipment: number,
 *   goodWill: number,
 *   intangibleAssets: number,
 *   otherAssets: number,
 *   deferredLongTermAssetCharges: number,
 *   totalAssets: number,
 *   accountsPayable: number,
 *   shortLongTermDebt: number,
 *   otherCurrentLiab: number,
 *   longTermDebt: number,
 *   otherLiab: number,
 *   minorityInterest: number,
 *   totalCurrentLiabilities: number,
 *   totalLiab: number,
 *   commonStock: number,
 *   retainedEarnings: number,
 *   treasuryStock: number,
 *   capitalSurplus: number,
 *   otherStockholderEquity: number,
 *   totalStockholderEquity: number,
 *   netTangibleAssets: number
 * }}
 */

/**
 * @name IncomeStatement
 * @typedef {{
 *   endDate: string,
 *   maxAge: number,
 *   totalRevenue: number,
 *   costOfRevenue: number,
 *   grossProfit: number,
 *   researchDevelopment: number,
 *   sellingGeneralAdministrative: number,
 *   nonRecurring: number,
 *   otherOperatingExpenses: number,
 *   totalOperatingExpenses: number,
 *   operatingIncome: number,
 *   totalOtherIncomeExpenseNet: number,
 *   ebit: number,
 *   interestExpense: number,
 *   incomeBeforeTax: number,
 *   incomeTaxExpense: number,
 *   minorityInterest: number,
 *   netIncomeFromContinuingOps: number,
 *   discontinuedOperations: number,
 *   extraordinaryItems: number,
 *   effectOfAccountingCharges: number,
 *   otherItems: number,
 *   netIncome: number,
 *   netIncomeApplicableToCommonShares: number
 * }}
 */

/**
 * @name IncomeCharts
 * @typedef {{
 *   maxAgeIsQuartChart: number[],
 *   endDateIsQuartChart: string[],
 *   totalRevenueIsQuartChart: number[],
 *   costOfRevenueIsQuartChart: number[],
 *   grossProfitIsQuartChart: number[],
 *   researchDevelopmentIsQuartChart: number[],
 *   sellingGeneralAdministrativeIsQuartChart: number[],
 *   nonRecurringIsQuartChart: number[],
 *   otherOperatingExpensesIsQuartChart: number[],
 *   totalOperatingExpensesIsQuartChart: number[],
 *   operatingIncomeIsQuartChart: number[],
 *   totalOtherIncomeExpenseNetIsQuartChart: number[],
 *   ebitIsQuartChart: number[],
 *   interestExpenseIsQuartChart: number[],
 *   incomeBeforeTaxIsQuartChart: number[],
 *   incomeTaxExpenseIsQuartChart: number[],
 *   minorityInterestIsQuartChart: number[],
 *   netIncomeFromContinuingOpsIsQuartChart: number[],
 *   discontinuedOperationsIsQuartChart: number[],
 *   extraordinaryItemsIsQuartChart: number[],
 *   effectOfAccountingChargesIsQuartChart: number[],
 *   otherItemsIsQuartChart: number[],
 *   netIncomeIsQuartChart: number[],
 *   netIncomeApplicableToCommonSharesIsQuartChart: number[],
 *
 *   maxAgeIsAnnuChart: number[],
 *   endDateIsAnnuChart: string[],
 *   totalRevenueIsAnnuChart: number[],
 *   costOfRevenueIsAnnuChart: number[],
 *   grossProfitIsAnnuChart: number[],
 *   researchDevelopmentIsAnnuChart: number[],
 *   sellingGeneralAdministrativeIsAnnuChart: number[],
 *   nonRecurringIsAnnuChart: number[],
 *   otherOperatingExpensesIsAnnuChart: number[],
 *   totalOperatingExpensesIsAnnuChart: number[],
 *   operatingIncomeIsAnnuChart: number[],
 *   totalOtherIncomeExpenseNetIsAnnuChart: number[],
 *   ebitIsAnnuChart: number[],
 *   interestExpenseIsAnnuChart: number[],
 *   incomeBeforeTaxIsAnnuChart: number[],
 *   incomeTaxExpenseIsAnnuChart: number[],
 *   minorityInterestIsAnnuChart: number[],
 *   netIncomeFromContinuingOpsIsAnnuChart: number[],
 *   discontinuedOperationsIsAnnuChart: number[],
 *   extraordinaryItemsIsAnnuChart: number[],
 *   effectOfAccountingChargesIsAnnuChart: number[],
 *   otherItemsIsAnnuChart: number[],
 *   netIncomeIsAnnuChart: number[],
 *   netIncomeApplicableToCommonSharesIsAnnuChart: number[]
 * }}
 */

/**
 * @name CashFlowCharts
 * @typedef {{
 *   endDateCfQuartChart: string[],
 *   dividendsPaidCfQuartChart: number[],
 *   maxAgeCfQuartChart: number[],
 *   netIncomeCfQuartChart: number[],
 *   depreciationCfQuartChart: number[],
 *   changeToNetincomeCfQuartChart: number[],
 *   changeToAccountReceivablesCfQuartChart: number[],
 *   changeToLiabilitiesCfQuartChart: number[],
 *   changeToOperatingActivitiesCfQuartChart: number[],
 *   totalCashFromOperatingActivitiesCfQuartChart: number[],
 *   capitalExpendituresCfQuartChart: number[],
 *   investmentsCfQuartChart: number[],
 *   totalCashflowsFromInvestingActivitiesCfQuartChart: number[],
 *   totalCashFromFinancingActivitiesCfQuartChart: number[],
 *   issuanceOfStockCfQuartChart: number[],
 *   netBorrowingsCfQuartChart: number[],
 *   otherCashflowsFromFinancingActivitiesCfQuartChart: number[],
 *   changeInCashCfQuartChart: number[],
 *   endDateCfAnnuChart: string[],
 *   dividendsPaidCfAnnuChart: number[],
 *   maxAgeCfAnnuChart: number[],
 *   netIncomeCfAnnuChart: number[],
 *   depreciationCfAnnuChart: number[],
 *   changeToNetincomeCfAnnuChart: number[],
 *   changeToAccountReceivablesCfAnnuChart: number[],
 *   changeToLiabilitiesCfAnnuChart: number[],
 *   changeToOperatingActivitiesCfAnnuChart: number[],
 *   totalCashFromOperatingActivitiesCfAnnuChart: number[],
 *   capitalExpendituresCfAnnuChart: number[],
 *   investmentsCfAnnuChart: number[],
 *   totalCashflowsFromInvestingActivitiesCfAnnuChart: number[],
 *   totalCashFromFinancingActivitiesCfAnnuChart: number[],
 *   issuanceOfStockCfAnnuChart: number[],
 *   netBorrowingsCfAnnuChart: number[],
 *   otherCashflowsFromFinancingActivitiesCfAnnuChart: number[],
 *   changeInCashCfAnnuChart: number[]
 * }}
 */

/**
 * @name BalanceSheetCharts
 * @typedef {{
 *   endDateBsQuartChart: string[],
 *   maxAgeBsQuartChart: number[],
 *   cashBsQuartChart: number[],
 *   shortTermInvestmentsBsQuartChart: number[],
 *   netReceivablesBsQuartChart: number[],
 *   inventoryBsQuartChart: number[],
 *   otherCurrentAssetsBsQuartChart: number[],
 *   totalCurrentAssetsBsQuartChart: number[],
 *   longTermInvestmentsBsQuartChart: number[],
 *   propertyPlantEquipmentBsQuartChart: number[],
 *   goodWillBsQuartChart: number[],
 *   intangibleAssetsBsQuartChart: number[],
 *   otherAssetsBsQuartChart: number[],
 *   deferredLongTermAssetChargesBsQuartChart: number[],
 *   totalAssetsBsQuartChart: number[],
 *   accountsPayableBsQuartChart: number[],
 *   shortLongTermDebtBsQuartChart: number[],
 *   otherCurrentLiabBsQuartChart: number[],
 *   longTermDebtBsQuartChart: number[],
 *   otherLiabBsQuartChart: number[],
 *   minorityInterestBsQuartChart: number[],
 *   totalCurrentLiabilitiesBsQuartChart: number[],
 *   totalLiabBsQuartChart: number[],
 *   commonStockBsQuartChart: number[],
 *   retainedEarningsBsQuartChart: number[],
 *   treasuryStockBsQuartChart: number[],
 *   capitalSurplusBsQuartChart: number[],
 *   otherStockholderEquityBsQuartChart: number[],
 *   totalStockholderEquityBsQuartChart: number[],
 *   netTangibleAssetsBsQuartChart: number[],
 *
 *   endDateBsAnnuChart: string[],
 *   maxAgeBsAnnuChart: number[],
 *   cashBsAnnuChart: number[],
 *   shortTermInvestmentsBsAnnuChart: number[],
 *   netReceivablesBsAnnuChart: number[],
 *   inventoryBsAnnuChart: number[],
 *   otherCurrentAssetsBsAnnuChart: number[],
 *   totalCurrentAssetsBsAnnuChart: number[],
 *   longTermInvestmentsBsAnnuChart: number[],
 *   propertyPlantEquipmentBsAnnuChart: number[],
 *   goodWillBsAnnuChart: number[],
 *   intangibleAssetsBsAnnuChart: number[],
 *   otherAssetsBsAnnuChart: number[],
 *   deferredLongTermAssetChargesBsAnnuChart: number[],
 *   totalAssetsBsAnnuChart: number[],
 *   accountsPayableBsAnnuChart: number[],
 *   shortLongTermDebtBsAnnuChart: number[],
 *   otherCurrentLiabBsAnnuChart: number[],
 *   longTermDebtBsAnnuChart: number[],
 *   otherLiabBsAnnuChart: number[],
 *   minorityInterestBsAnnuChart: number[],
 *   totalCurrentLiabilitiesBsAnnuChart: number[],
 *   totalLiabBsAnnuChart: number[],
 *   commonStockBsAnnuChart: number[],
 *   retainedEarningsBsAnnuChart: number[],
 *   treasuryStockBsAnnuChart: number[],
 *   capitalSurplusBsAnnuChart: number[],
 *   otherStockholderEquityBsAnnuChart: number[],
 *   totalStockholderEquityBsAnnuChart: number[],
 *   netTangibleAssetsBsAnnuChart: number[]
 * }}
 */

/**
 * @typedef {IncomeStatement & BalanceSheet & CashFlows & IncomeCharts & BalanceSheetCharts & CashFlowCharts & {
 *  lastFiscalYearEnd: string,
 *  dividendsPaid: number,
 *  country, nonIndexOwners:(string|*), wsjChartThreeMonthAgo, incomeEPSChartQuart:*, percentRepurchasedMRQ:number, leveredFreeCashFlowPerShare:(*|number), debtToCapital:number, industry, wsjChartCurrentNum, payoutRatioMRQ:number, buybackRatio:(number|string), quarterlyRevenueChart:*[], boardRisk, upgradeDowngradeHistory:(string|string), mostRecentQuarter:(string|string), overallRisk, totalCashPerShare:*, sector, operatingMargins:(*|number), incomeEPSChartAnnu:*, institutionsCount:(*|null), compensationRisk, numAnaylstRecommendations:T, operatingCashFlowPerShareMRQ:*, totalDebt:*, wsjChartMonthAgo, freeCashFlowPerShareMRQ:*, quarterlyEPSActualEstimateChart, wsjChartCurrent, freeCashFlowPerShareTTM:*, shareHolderRightsRisk, recommendationKey, totalRevenueTTM:(*|number), anaylstRecommendations:([]|[*, *, *, *, *]), longBusinessSummary, enterpriseToRevenue:(*|boolean|number), salesPerShareMRQ:(string|number), salesPerShareTTM:*, dividendChart:*[], auditRisk, earliestEarningsDate:(number|*)}}
 * @name CompanyData
 */
