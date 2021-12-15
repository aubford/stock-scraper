const puppeteer = require("puppeteer-core")
const { sortBy } = require("lodash")
const {
  newBrowserPage,
  promptLogin,
  backupReturnStockDataFile,
  promptUser,
  getOnlyStockTickerData,
  begin,
  exit,
} = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { getSectorIndex, sectorMap } = require("../database/introspectStockData")

puppeteer.connect(CONNECTION).then(async browser => {
  begin()

  await promptLogin((url, options) => newBrowserPage(browser, url, options))
  const sectorUserInputVal = await promptUser("Sectors:")

  const oldFile = backupReturnStockDataFile()
  const stockData = getOnlyStockTickerData(oldFile)
  const sectorIndex = getSectorIndex(stockData)

  const updateSector = async sector => {
    console.log(`+++++++ Updating Sector: ${sector} +++++++`)
    const tickers = sectorIndex[sector]
    await scrapeDataForTickers(tickers, browser)

    console.log(`SECTOR UPDATED: ${sector} ✅`)
  }

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
  const sectorsSortedByUpdateDate = sortBy(
    [...sectors],
    sector => new Date(stockData[sectorIndex[sector][0]].scrapeDataUpdatedAt)
  )

  if (sectors.length === 0) {
    throw new Error(":-( ERROR: NO SECTORS SELECTED :-(")
  }

  for (const sector of sectorsSortedByUpdateDate) {
    await updateSector(sector)
  }

  exit()
})
