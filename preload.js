// Modules
global.fetch = require("node-fetch")
global._ = require("lodash")
global.fs = require("fs")

const { webSocketDebuggerUrl } = require("./ws.json")
global.CONNECTION = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

// Constants

global.PAUSE_MS = 200
global.XPATH_TIMEOUT = 20000

global.ARGUS_ANALYST_KEY = "Argus Analyst"
global.ARGUS_RESEARCH_KEY = "Argus Research A6/Quantitative (i)"
global.ZACKS_KEY = "Zacks Investment Research, Inc (i)"
global.FIDELITY = "fidelity"
global.FIDELITY_STATS = "fidelityStats"
global.FORD = "ford"
global.NEW_CONSTRUCTS = "nc"
global.THE_STREET = "theStreet"
global.ARGUS_ANALYST = "argusAnalyst"
global.ARGUS_RESEARCH = "argusResearch"
global.ZACKS = "zacks"
global.MORNINGSTAR = "morningstar"
global.CFRA = "CFRA"
global.BOA = "BoA"
global.YAHOO_MODULES = [
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

global.SCRAPBOOK_LOCATION = "/Users/aubrey/Google Drive/stock-scrapbook"
global.STOCK_DATA_LOCATION = `${SCRAPBOOK_LOCATION}/stockData.json`
global.STOCK_DATA_BACKUP_LOCATION = `${SCRAPBOOK_LOCATION}/stockDataBackup.json`
