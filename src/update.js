const puppeteer = require("puppeteer-core")
const { omit, sortBy } = require("lodash")
const {
  newBrowserPage,
  scrapbookWriteOut,
  promptLogin,
  backupReturnStockDataFile,
  promptUser,
  promptForPause,
  getOnlyStockTickerData,
} = require("./util")
const scrapeDataForTickers = require("./scrapeDataForTickers")
const { getSectorIndex, sectorMap } = require("./introspectStockData")

const exit = () => {
  console.log("** All Updates Completed Successfully **")
  process.exit(0)
}

puppeteer.connect(CONNECTION).then(async browser => {
  await promptForPause()

  await promptLogin((url, options) => newBrowserPage(browser, url, options))
  const sectorUserInputVal = await promptUser("Sectors:")

  console.warn("********  Turn on PDF Viewer extension!!!! ********")

  const oldFile = backupReturnStockDataFile()
  const stockData = getOnlyStockTickerData(oldFile)
  const sectorIndex = getSectorIndex(stockData)

  const updateSector = async sector => {
    console.log(`+++++++ Updating Sector: ${sector} +++++++`)
    const tickers = sectorIndex[sector]
    const newStockData = await scrapeDataForTickers(tickers, browser)

    scrapbookWriteOut(newStockData)
    console.log(`*************** SECTOR UPDATED OK: ${sector} *****************`)
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
