const { fromPairs, isEqual, uniq, flatten, sortBy, assign, values, keys, isArray, endsWith, last, union, chunk } = LodashGS.load()
const stocksSheetName = "Stocks"
const portfolioSheetName = "Portfolio"
const sort = arr => sortBy(arr, val => val.toLowerCase())

function setDateCell(spreadsheet){
  const date = new Date()
  date.setHours(12,0,0,0)
  const stockSheet = spreadsheet.getSheetByName(stocksSheetName)
  const portfolioSheet = spreadsheet.getSheetByName(portfolioSheetName)

  stockSheet.getRange("B2").setValues([[date]])
  portfolioSheet.getRange("B2").setValues([[date]])
}

function test(){
  const spreadsheet = SpreadsheetApp.getActive()
  setDateCell(spreadsheet)
}

// 🦃 ON OPEN 🦃
function onOpen() {
  const spreadsheet = SpreadsheetApp.getActive()

  setDateCell(spreadsheet)

  const menuItems = [
    { name: 'Fetch All...', functionName: 'fetchAll' },
    { name: 'Get ARK Chart...', functionName: 'getArkChart' },
    { name: 'Show Logs', functionName: 'showLogs'},
    { name: 'Clear Logs', functionName: 'clearLog'}
  ]
  spreadsheet.addMenu('Aubrey', menuItems)
}

function clearLog(){
  PropertiesService.getDocumentProperties().setProperty("log","")
}

function addLog(msg){
  const currentLog = PropertiesService.getDocumentProperties().getProperty("log") || ""
  PropertiesService.getDocumentProperties().setProperty("log", `${currentLog}\n ********* \n ${msg}`)
}

function showLogs(){
  const log = PropertiesService.getDocumentProperties().getProperty("log") || ""
  SpreadsheetApp.getUi().alert(log)
}

const accessCacheTicker = (ticker, cache) => {
  if (cache) {
    try {
      const cached = cache.get(ticker)
      const parsed = JSON.parse(cached)
      if(isArray(parsed)){
        return parsed
      }
    } catch(err){
      addLog(err)
    }
  }
}

function getFromCache(ticker) {
  const cache = ticker ? CacheService.getDocumentCache() : false
  return accessCacheTicker(ticker, cache) || "NO CACHED DATA"
}

function getDateFromCache(ticker) {
  const cache = ticker ? CacheService.getDocumentCache() : false
  const cachedDates = accessCacheTicker(ticker, cache)
  if(!cachedDates){
    return "NO CACHED DATA"
  }
  return cachedDates.map(date => new Date(date))
}

function gfPricesSimple(data) {
  if (isArray(data)) {
    return data.slice(1).map(d => d[1]).reverse()
  }
  return "???"
}

function gfPrices(data, ticker) {
  const cache = ticker ? CacheService.getDocumentCache() : false

  if (isArray(data)) {
    const prices = data.slice(1).map(d => d[1]).reverse()
    if (cache) {
      cache.put(ticker, JSON.stringify(prices), 21600)
    }
    return prices
  }

  return accessCacheTicker(ticker, cache) || data
}

function gfDatesSimple(data) {
  if (isArray(data)) {
    return data.slice(1).map(d => d[0]).reverse()
  }
  return "???"
}

function gfDates(data, ticker) {
  const cache = ticker ? CacheService.getDocumentCache() : false

  if (isArray(data)) {
    const dates = data.slice(1).map(d => d[0]).reverse()
    if (cache) {
      cache.put(ticker, JSON.stringify(dates), 21600)
    }
    return dates
  }
  
  const cachedDates = accessCacheTicker(ticker, cache)
  if(!cachedDates){
    return data
  }
  return cachedDates.map(date => new Date(date))
}

// Google Drive
function getDriveData(name) {
  const files = DriveApp.getFilesByName(name)
  if (files.hasNext()) {
    const file = files.next().getBlob().getDataAsString()
    return JSON.parse(file)
  }
}

const arkkPlaceholder = { arkkChart: "", arkkPct: "", arkkChange: "" }
// ⭐︎ FETCH STOCK DATA ⭐︎
function fetchStockData() {
  const arkkData = getArkkData()
  const { magicTickers, buffetData, ...stockData } = getDriveData("stockData.json")
  const { wsjShortDatePrev } = getDriveData("stockDataMeta.json")
  const tickers = sort(Object.keys(stockData))
  return {
    companyData: tickers.map(ticker => ({
      ...stockData[ticker],
      isMagic: magicTickers.includes(ticker),
      buffetData: buffetData[ticker],
      ...(arkkData[ticker] || arkkPlaceholder),
      wsjShortDatePrev
    })),
    tickers
  }
}

// 🐳 FETCH ALL 🐳
function fetchAll() {
  const fetchDate = new Date().toLocaleString()
  const { companyData, tickers } = fetchStockData()

  const firstColumnValues = getFirstColumnValues(companyData)
  const dataRows = firstColumnValues.map(dataPoint => [
    dataPoint,
    ...companyData.map(({ [dataPoint]: datum }) => stringIfArray(datum))
  ])

  const newSheetRowMatrix = [["", ...tickers], ...dataRows]
  const newSheet = SpreadsheetApp.getActive().insertSheet(fetchDate)

  const newSheetWithValues = setDataRange(newSheetRowMatrix, newSheet)

  const stockSheet = getSheet(stocksSheetName)
  const portfolioSheet = getSheet(portfolioSheetName)
  setStockSheetTitles(stockSheet, fetchDate, newSheetRowMatrix.length)
  setStockSheetTitles(portfolioSheet, fetchDate, newSheetRowMatrix.length)

  newSheetWithValues.getDataRange().applyRowBanding()
  newSheet.setFrozenColumns(1)
  newSheet.setFrozenRows(1)
}

//////// UTIL /////////


function getFirstColumnValues(companyData) {
  const clone = { ...companyData }
  return sort(keys(assign({}, ...values(clone))))
}


function getSheet(name) {
  return SpreadsheetApp.getActive().getSheetByName(name)
}

function setDataRange(rowMatrix, sheet) {
  const numRows = rowMatrix.length
  const numCols = rowMatrix[0].length

  sheet.getRange(1, 1, numRows, numCols)
    .setValues(rowMatrix)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")

  return sheet.setColumnWidths(1, numCols, 300)
}

function stringIfArray(datum) {
  return isArray(datum) ? datum.join(";") : datum
}


function setStockSheetTitles(stockSheet, newDate, numRows) {
  const addyString = `${newDate}!1:`
  stockSheet.getRange(1, 1, 1, 2).setValues([[addyString + "1", addyString + numRows]])
}
