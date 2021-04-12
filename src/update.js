const puppeteer = require("puppeteer-core")
const { omit, sortBy } = require("lodash")
const {
  newBrowserPage,
  scrapbookWriteOut,
  promptLogin,
  backupReturnStockDataFile,
  promptUser,
  promptForPause,
} = require("./util")
const scrapeDataForTickers = require("./scrapeDataForTickers")
const { getSectorIndex, sectorMap } = require("./introspectStockData")

const exit = () => {
  console.log("** All Updates Completed Successfully **")
  process.exit(0)
}

puppeteer.connect(CONNECTION).then(async browser => {
  await promptForPause()

  const closeLoginPages = await promptLogin((url, options) =>
    newBrowserPage(browser, url, options)
  )
  const sectorUserInputVal = await promptUser("Sectors:")

  console.warn("********  Turn on PDF Viewer extension!!!! ********")
  closeLoginPages()

  const oldFile = backupReturnStockDataFile()
  const stockData = omit(oldFile, ["buffetData", "magicTickers"])
  const sectorIndex = getSectorIndex(stockData)

  const updateSector = async sector => {
    console.log(`** Updating Sector: ${sector} **`)
    const tickers = sectorIndex[sector]
    const newStockData = await scrapeDataForTickers(tickers, browser)

    scrapbookWriteOut(newStockData, true)
    console.log(`*************** SECTOR UPDATED OK: ${sector} *****************`)
  }

  const selectedSingleSector = sectorMap.get(sectorUserInputVal)
  if (selectedSingleSector) {
    await updateSector(selectedSingleSector)
    exit()
  }

  const sectors = Object.keys(sectorIndex)
  const sectorsSortedByUpdateDate = sortBy(
    sectors,
    sector => sectorIndex[sector][0].scrapeDataUpdatedAt
  )

  const sectorsToFetch = sectorUserInputVal
    ? sectorsSortedByUpdateDate.slice(0, sectorUserInputVal)
    : sectorsSortedByUpdateDate

  if (sectors.length === 0) {
    throw new Error(":-( ERROR: NO SECTORS SELECTED :-(")
  }

  for (const sector of sectorsToFetch) {
    await updateSector(sector)
  }
  exit()
})
