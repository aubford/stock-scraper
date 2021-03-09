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

global.PAUSE_MS = process.argv.length > 2 ? Number(process.argv[2]) * 1000 : 3000
console.log("PAUSE MS", PAUSE_MS)
global.XPATH_TIMEOUT = 20000

global.ARGUS_ANALYST_KEY = "Argus Analyst"
global.ARGUS_RESEARCH_KEY = "Argus Research A6/Quantitative (i)"
global.ZACKS_KEY = "Zacks Investment Research, Inc (i)"
global.FIDELITY = "fidelity"
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
  "summaryProfile",
  "summaryDetail",
  "esgScores",
  "price",
  "defaultKeyStatistics",
  "financialData",
  "calendarEvents",
  "secFilings",
  "recommendationTrend",
  "upgradeDowngradeHistory",
  "institutionOwnership",
  "fundOwnership",
  "majorDirectHolders",
  "majorHoldersBreakdown",
  "insiderTransactions",
  "insiderHolders",
  "netSharePurchaseActivity",
  "earnings",
  "earningsTrend",
  "industryTrend",
  "indexTrend",
  "sectorTrend",
  "cashflowStatementHistory",
  "cashflowStatementHistoryQuarterly",
  "incomeStatementHistoryQuarterly",
  "balanceSheetHistoryQuarterly",
]

global.SCRAPBOOK_LOCATION = "/Users/aubrey/Google Drive/stock-scrapbook"
global.STOCK_DATA_LOCATION = `${SCRAPBOOK_LOCATION}/stockData.json`
global.STOCK_DATA_BACKUP_LOCATION = `${SCRAPBOOK_LOCATION}/stockDataBackup.json`
