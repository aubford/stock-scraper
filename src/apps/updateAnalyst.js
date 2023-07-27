const puppeteer = require("puppeteer-core")
const {
  fidelityAnalysts,
  fidelityStats,
  newConstructs,
  zacksReport,
  tipranks,
  td,
} = require("../api")
const {
  scrapbookWriteOut,
  promptUser,
  getStockDataFile,
  getOnlyStockTickerData,
  exit,
  begin,
} = require("../util")
const { getSectorIndex, sectorMap } = require("../database/introspectStockData")

const analystMap = {
  [NEW_CONSTRUCTS]: newConstructs,
  [ZACKS]: zacksReport,
  [FIDELITY_STATS]: fidelityStats,
  [FIDELITY]: fidelityAnalysts,
  [TIPRANKS]: tipranks,
  [TD]: td,
}

const stockDataFile = getStockDataFile()
const stockData = getOnlyStockTickerData(stockDataFile)
const sectorIndex = getSectorIndex(stockData)

puppeteer.connect(CONNECTION).then(async browser => {
  begin()

  const analyst = await promptUser("Analyst: ")
  const fetchAnalystData = analystMap[analyst].fetch

  const sectorsUpdated = []
  const updateSector = async sector => {
    console.log(`+++++++ Updating Sector: ${sector} +++++++`)

    const tickers = sectorIndex[sector]
    console.log("Searching for tickers:", tickers)

    const newData = {}
    for (const ticker of tickers) {
      try {
        const analystLink = stockData[ticker][analyst + "Link"]
        newData[ticker] = await fetchAnalystData(ticker, browser, analystLink)
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
