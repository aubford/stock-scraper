const {
  fromPairs,
  isEqual,
  uniq,
  flatten,
  sortBy,
  assign,
  values,
  keys,
  isArray,
  endsWith,
  last,
  union,
} = LodashGS.load()
const stocksSheetName = "Stocks"

const sort = arr => sortBy(arr, val => val.toLowerCase())

function gfPrices(data, ticker) {
  const cache = ticker && CacheService.getDocumentCache()
  if (isArray(data)) {
    const prices = data
      .slice(1)
      .map(d => d[1])
      .reverse()
    if (cache) {
      cache.put(ticker, JSON.stringify(prices))
    }
    return prices
  }
  if (cache) {
    return cache.get(JSON.parse(ticker)) || "NoCache???"
  }
  return "???"
}

function gfDates(data) {
  Logger.log(data)
  if (isArray(data)) {
    return data
      .slice(1)
      .map(d => d[0])
      .reverse()
  }
  return "???"
}

// 🦃 ON OPEN 🦃
function onOpen() {
  const spreadsheet = SpreadsheetApp.getActive()
  const menuItems = [{ name: "Fetch All...", functionName: "fetchAll" }]
  spreadsheet.addMenu("Aubrey", menuItems)
}

// Google Drive
function getDriveData() {
  const files = DriveApp.getFilesByName("stockData.json")
  if (files.hasNext()) {
    const file = files.next().getBlob().getDataAsString()
    return JSON.parse(file)
  }
}

// ⭐︎ FETCH COMPANY DATA ⭐︎
function fetchStockData() {
  const { arkkPct, arkkChart } = getArkkData()
  const { magicTickers, buffetData, ...stockData } = getDriveData()
  const tickers = sort(Object.keys(stockData))
  return {
    companyData: tickers.map(ticker => ({
      ...stockData[ticker],
      isMagic: magicTickers.includes(ticker),
      buffetData: buffetData[ticker],
      arkkData: arkkChart[ticker] || [0],
      arkkPct: arkkPct[ticker] || [0],
    })),
    tickers,
  }
}

// 🐳 FETCH ALL 🐳
function fetchAll() {
  const fetchDate = new Date().toLocaleString()
  const { companyData, tickers } = fetchStockData()

  const firstColumnValues = getFirstColumnValues(companyData)
  const dataRows = firstColumnValues.map(dataPoint => [
    dataPoint,
    ...companyData.map(({ [dataPoint]: datum }) => stringIfArray(datum)),
  ])

  const newSheetRowMatrix = [["", ...tickers], ...dataRows]
  const newSheet = SpreadsheetApp.getActive().insertSheet(fetchDate)

  const newSheetWithValues = setDataRange(newSheetRowMatrix, newSheet)

  const stockSheet = getSheet(stocksSheetName)
  setStockSheetTitles(stockSheet, fetchDate, newSheetRowMatrix.length)

  newSheetWithValues.getDataRange().applyRowBanding()
  newSheet.setFrozenColumns(1)
  newSheet.setFrozenRows(1)
}

// 😎 FETCH NEW 😎
function fetchNew() {
  const newDate = new Date().toLocaleString()
  const stockSheet = getSheet(stocksSheetName)
  const stockSheetFirstRow = stockSheet.getDataRange().getValues()[0]

  const dataSheetName = stockSheetFirstRow.shift().replace("!1:1", "")
  const stockSheetTickers = stockSheetFirstRow.slice(1)

  const dataSheet = getSheet(dataSheetName)
  const dataSheetValues = dataSheet.getDataRange().getValues()

  const dataSheetFirstRow = dataSheetValues[0]
  const dataSheetTickers = dataSheetFirstRow.slice(1)
  const tickersToFetch = stockSheetTickers.filter(
    ticker => !dataSheetTickers.includes(ticker)
  )

  const companyData = fetchCompanyData(tickersToFetch)

  const newValues = dataSheetValues.slice(1).map(row =>
    row.concat(
      companyData.map(({ [row[0]]: datum }) => {
        Logger.log(row[0])
        Logger.log(datum)
        const strung = stringIfArray(datum)
        return strung
      })
    )
  )

  setDataRange([dataSheetFirstRow.concat(tickersToFetch), ...newValues], dataSheet)
  dataSheet.setName(newDate)

  setStockSheetTitles(stockSheet, newDate, newValues.length)
}

// 👻 CLEAR MANUAL DATA FOR NEW COLUMN 👻
function clearManualData() {
  const range = SpreadsheetApp.getActiveRange()
  const sheet = range.getSheet()
  const firstSelectedCol = range.getColumn()
  const lastSelectedCol = range.getLastColumn()

  const manualLabel = sheet.createTextFinder("--Manual--").findNext()
  const manualRow = manualLabel.getRow()

  const readListLabl = sheet.createTextFinder("-Reading List-").findNext()
  const clearRows = readListLabl.getRow() - manualRow - 1

  const numCols = 1 + lastSelectedCol - firstSelectedCol
  sheet.getRange(manualRow, firstSelectedCol, clearRows, numCols).clearContent()
}

//////// UTIL /////////

function returnSelectedTickers() {
  const rangeList = SpreadsheetApp.getActiveRangeList().getRanges()
  const selectedTickers = rangeList.reduce((acc, curr) => {
    const values = curr.getValues()
    if (values.length > 1) {
      throw new Error("Only select cells in the 'Tickers' row!!")
    }
    return acc.concat(values[0])
  }, [])

  if (!selectedTickers.every(ticker => getTickers().includes(ticker))) {
    throw new Error("Only select cells in the 'Tickers' row!!")
  }
  return selectedTickers
}

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

  sheet
    .getRange(1, 1, numRows, numCols)
    .setValues(rowMatrix)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")

  return sheet.setColumnWidths(1, numCols, 300)
}

function parseJSON(jsonString) {
  return JSON.parse(jsonString, (key, value) => {
    if (isDateString(value)) {
      return new Date(value)
    }
    return value
  })
}

function stringIfArray(datum) {
  return isArray(datum) ? datum.join(";") : datum
}

function isDateString(str) {
  return Boolean(
    !Number(str) &&
      endsWith(str, "Z") &&
      ["T", "-", ":", "."].every(val => str.includes(val)) &&
      !str.includes("%")
  )
}

function setStockSheetTitles(stockSheet, newDate, numRows) {
  const addyString = `${newDate}!1:`
  stockSheet.getRange(1, 1, 1, 2).setValues([[addyString + "1", addyString + numRows]])
}
