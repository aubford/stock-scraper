const { sortBy } = require("lodash")
const { goToNewBrowserPage, connectAndRunApp } = require("../puppeteer")
const { promptLogin, getStockDataFile, promptUser, begin, exit } = require("../util")
const scrapeDataForTickers = require("../scrapeDataForTickers")
const { getSectorIndex, sectorMap } = require("../database/introspectStockData")

connectAndRunApp(async browser => {
  begin()

  const closeLoginPages = await promptLogin((url, options) =>
    goToNewBrowserPage(browser, url, options)
  )
  const sectorUserInputVal = await promptUser("Sectors:")

  const stockData = getStockDataFile()
  const sectorIndex = getSectorIndex(stockData)

  const updateSector = async sector => {
    console.log(`+++++++ Updating Sector: ${sector} +++++++`)
    const tickers = sectorIndex[sector]
    await scrapeDataForTickers(tickers, browser, SHOULD_MERGE)

    console.log(`SECTOR UPDATED: ${sector} ✅`)
  }

  closeLoginPages()

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
