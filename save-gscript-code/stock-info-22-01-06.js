// noinspection JSUnresolvedVariable,JSUnresolvedFunction

const DATA_FILE_NAME = "vooData.json"
const DATA_SPREADSHEET_NAME = "VOO DATA"
const { sortBy, assign, values, keys, isArray } = LodashGS.load()
const sort = arr => sortBy(arr, val => val.toLowerCase())

// 🦃 ON OPEN 🦃
function onOpen() {
  const spreadsheet = SpreadsheetApp.getActive()

  const menuItems = [
    { name: "Fetch All...", functionName: "fetchAll" },
    { name: "Show Logs", functionName: "showLogs" },
    { name: "Clear Logs", functionName: "clearLog" },
  ]
  spreadsheet.addMenu("Aubrey", menuItems)
}

const clearLog = () => {
  PropertiesService.getDocumentProperties().setProperty("log", "")
}

const addLog = msg => {
  const currentLog = PropertiesService.getDocumentProperties().getProperty("log") || ""
  PropertiesService.getDocumentProperties().setProperty(
    "log",
    `${currentLog}\n ********* \n ${msg}`
  )
}

const showLogs = () => {
  const log = PropertiesService.getDocumentProperties().getProperty("log") || ""
  SpreadsheetApp.getUi().alert(log)
}

// Google Drive
function getDriveData(name) {
  const files = DriveApp.getFilesByName(name)
  if (files.hasNext()) {
    const file = files.next().getBlob().getDataAsString()
    return JSON.parse(file)
  }
}

// ⭐︎ FETCH STOCK DATA ⭐︎
const fetchStockData = () => {
  const stockData = getDriveData(DATA_FILE_NAME)
  const tickers = sort(Object.keys(stockData))
  return {
    companyData: tickers.map(ticker => stockData[ticker]),
    tickers,
  }
}

// 🐳 FETCH ALL 🐳
const fetchAll = () => {
  const { companyData, tickers } = fetchStockData()

  const firstColumnValues = getFirstColumnValues(companyData)
  const dataRows = firstColumnValues.map(dataPoint => [
    dataPoint,
    ...companyData.map(({ [dataPoint]: datum }) => stringIfArray(datum)),
  ])

  const newSheetRowMatrix = [["", ...tickers], ...dataRows]
  const newSheet = SpreadsheetApp.getActive().insertSheet(DATA_SPREADSHEET_NAME)

  const newSheetWithValues = setDataRange(newSheetRowMatrix, newSheet)

  newSheetWithValues.getDataRange().applyRowBanding()
  newSheet.setFrozenColumns(1)
  newSheet.setFrozenRows(1)
}

//////// UTIL /////////

const getFirstColumnValues = companyData => {
  const clone = { ...companyData }
  return sort(keys(assign({}, ...values(clone))))
}

const setDataRange = (rowMatrix, sheet) => {
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

const stringIfArray = datum => {
  return isArray(datum) ? datum.join(";") : datum
}
