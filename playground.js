/* eslint-disable */
require("./globalEnv")
const {
  getStockDataFile,
  readJsonFile,
  stagingWriteOut,
  scrapbookWriteOut,
} = require("./src/util")
const _ = require("lodash")
const { uniq, assignWith, omitBy, isEmpty } = require("lodash") // Add this at the top if not already present

const stockData = getStockDataFile()
const vooData = readJsonFile(VOO_LOCATION)
const stockDataStaging = readJsonFile(STOCK_DATA_STAGING)
const vooDataStaging = readJsonFile(VOO_DATA_STAGING)

const shortEntries = _.pickBy(vooDataStaging["CARR"], (value, key) =>
  key.toLowerCase().includes("short")
)

const getUpdateDates = data => {
  const truncatedDates = Object.values(data)
    .map(stockData => stockData.updatedAt.slice(0, 7))
    .filter(Boolean)

  const uniqueDates = uniq(truncatedDates)
  return uniqueDates.map(date => [date, truncatedDates.filter(d => d === date).length])
}

/*
const errorEntries = _.pickBy(vooDataStaging["CARR"], (value, key) =>
  key.toLowerCase().includes('error')
)
*/

// Object.keys(stockData) /* ?+ */
const getDRKeys = data => {
  return Object.keys(data["AAPL"]).filter(key => key.includes("dataroma"))
}

const getDRKeysObj = obj => {
  return Object.keys(obj).filter(key => key.includes("dataroma"))
}
// Object.keys(stockDataStaging['AAPL']) /* ?+ */

// const removeEmptyValues = obj =>
//   omitBy(obj, (value, key) => isEmpty(value) && !key.includes("error"))
//
// const writeOut = (fileLocation, data, shouldMerge) => {
//   const existingContent = readJsonFile(fileLocation)
//
//   getDRKeys(existingContent) /* ?+ */
//   getDRKeys(data) /* ?+ */
//
//   const newContent = true
//     ? assignWith(existingContent, data, (objVal, srcVal) => {
//         getDRKeysObj(srcVal) /* ?+ */
//         const empty = removeEmptyValues(srcVal)
//         return { ...objVal, ...empty }
//       })
//     : {
//         ...existingContent,
//         ...data,
//       }
//
//   getDRKeys(newContent) /* ?+ */
//
//   return newContent
//
//   // writeJsonFile(fileLocation, newContent)
// }

getDRKeys(stockData) /* ?+ */
getDRKeys(vooData) /* ?+ */
getDRKeys(stockDataStaging) /* ?+ */
getDRKeys(vooDataStaging) /* ?+ */


const err = {
  "TMUS": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "ULTA": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "BSX": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "CRWD": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "PANW": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "FI": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "UBER": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "AVGO": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "GOOGL": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "AON": {
    "warnError_argus": "( fetchArgusAnalyst ): No Argust Analyst Report!"
  },
  "SPGI": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "ACGL": {
    "warnError_argus": "( fetchArgusAnalyst ): No Argust Analyst Report!"
  },
  "ABNB": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "HIG": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "LYB": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "LULU": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "MRNA": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "IBM": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "META": {
    "error_wsj": "( fetchData ): Should have chart & NO CHART found after multiple tries!"
  },
  "LIN": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "TMO": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "WFC": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "VZ": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "ISRG": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "PM": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "UNP": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "RTX": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "VRTX": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "SYK": {
    "warnError_zacks": "( getMainData ): Failed to fetch mainData"
  },
  "ADI": {
    "error_wsj": "( fetchData ): Should have chart & NO CHART found after multiple tries!"
  },
  "BA": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "MMC": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "CI": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "AMT": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "SNPS": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "BX": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "ANET": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "CMG": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "SO": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "ICE": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "MO": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "WM": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "TT": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "TDG": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "KKR": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "NXPI": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "MCO": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "PH": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "CEG": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "CTAS": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "PYPL": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "USB": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "MPC": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "ECL": {
    "warnError_zacks": "( getMainData ): Failed to fetch mainData"
  },
  "PCAR": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "HLT": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "CARR": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "GM": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "AIG": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "SPG": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "NEM": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "SRE": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "CPRT": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "NSC": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "O": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "JCI": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "DXCM": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "TEL": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "PSA": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "SMCI": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "BK": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "AMP": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "PRU": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "MET": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "ALL": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "Error: connect ETIMEDOUT 162.241.160.197:443"
  },
  "STZ": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "IDXX": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "GWW": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "OTIS": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "IQV": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "MPWR": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "MSCI": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "AME": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "COR": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "PAYX": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "RCL": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "PCG": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "NUE": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "IR": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "PEG": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "FAST": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "warnError_zacks": "( getMainData ): Failed to fetch mainData"
  },
  "MNST": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "KDP": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "KVUE": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "IT": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "EXC": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "EA": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "CTSH": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "XYL": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "ODFL": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "ED": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "MTD": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "HAL": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "CDW": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "XEL": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "VICI": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "ON": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "CHTR": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "TRGP": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "DG": {
    "error_fidelity": "TypeError: equitySummaryScore1YearHistory?.map is not a function"
  },
  "VST": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "RMD": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "ANSS": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "EIX": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "FSLR": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "CBRE": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "IRM": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "TROW": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "KHC": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "DECK": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "GRMN": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "WEC": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "WDC": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "WST": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "FITB": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "KEYS": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "EQR": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "PHM": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_zacks": "TypeError: fetch failed"
  },
  "DTE": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "ETR": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "TER": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "STT": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found",
    "error_zacks": "TypeError: fetch failed"
  },
  "STE": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "TYL": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "PPL": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "INVH": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "CTRA": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "LDOS": {
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "ES": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "FE": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "HUBB": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "GDDY": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "CNP": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found",
    "error_dataroma": "( JsDomFetcher:JsDomNode:_xpaths ): No element found for xpath: //table[@id='grid']/tbody/tr"
  },
  "GPC": {
    "warnError_moodys": "( fetchMoodysRecurse ): No moodysLink found"
  },
  "BALL": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  },
  "APTV": {
    "warnError_moodys": "( getMoodysLink ): No moodysLink found"
  }
}

Object.keys(err).length /* ?+ */