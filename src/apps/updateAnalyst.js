const puppeteer = require("puppeteer-core")
const {
  fetchFidelityAnalystOpinions,
  fetchFidelityKeyStats,
  fetchNewConstructs,
  fetchZacks,
  fetchTipData,
  fetchTdData,
} = require("../api")
const {
  getFidelitySecretUrl,
  scrapbookWriteOut,
  promptUser,
  backupReturnStockDataFile,
  getOnlyStockTickerData,
  exit,
  begin,
} = require("../util")
const { getSectorIndex, sectorMap } = require("../database/introspectStockData")

/** @type {Object<function>} */
const analystMap = {
  [NEW_CONSTRUCTS]: fetchNewConstructs,
  [ZACKS]: fetchZacks,
  [FIDELITY_STATS]: fetchFidelityKeyStats,
  [FIDELITY]: fetchFidelityAnalystOpinions,
  [TIPRANKS]: fetchTipData,
  [TD]: fetchTdData,
}

const stockDataFile = backupReturnStockDataFile()
const stockData = getOnlyStockTickerData(stockDataFile)
const sectorIndex = getSectorIndex(stockData)

puppeteer.connect(CONNECTION).then(async browser => {
  begin()

  const analyst = await promptUser("Analyst: ")
  const fetchAnalystData = analystMap[analyst]

  const sectorsUpdated = []
  const updateSector = async sector => {
    console.log(`+++++++ Updating Sector: ${sector} +++++++`)

    const tickers = sectorIndex[sector]
    console.log("Searching for tickers:", tickers)

    const newData = {}
    for (const ticker of tickers) {
      try {
        let url
        if ([ZACKS, ARGUS_RESEARCH, ARGUS_ANALYST].includes(analyst)) {
          const link = stockData[ticker][analyst + "Link"]
          if (link) {
            url = await getFidelitySecretUrl(link, browser, ticker)
          }
        }

        newData[ticker] = await fetchAnalystData(ticker, browser, url)
      } catch (err) {
        console.log(`${ticker}: xxx FAIL xxx`, err)
      }
    }

    scrapbookWriteOut(newData, true)

    console.log(`SECTOR UPDATED: ${sector} ✅`)
    sectorsUpdated.push(sector)
    console.log(`⭐️ ALL SECTORS UPDATED: ${sectorsUpdated.join(", ")} ⭐️`)
  }

  const sectorUserInputVal = await promptUser("Sectors:")
  const selectedSingleSector = sectorMap.get(sectorUserInputVal)
  if (selectedSingleSector) {
    await updateSector(selectedSingleSector)
    exit()
  }
  const sectors = sectorUserInputVal
    ? sectorUserInputVal
        .split(/[^A-Z]/)
        .filter(a => a)
        .map(abbrev => sectorMap.get(abbrev))
    : Object.keys(sectorIndex)

  if (sectors.length === 0) {
    throw new Error(":-( ERROR: NO SECTORS SELECTED :-(")
  }

  for (const sector of sectors) {
    await updateSector(sector)
  }

  exit()
})
