const cheerio = require("cheerio")
const { fromPairs } = require("lodash")
const yauzl = require("yauzl")
const { extractNumbers, isValidTicker } = require("./util")

const SPY_HOLDINGS_URL =
  "https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spy.xlsx"

const XLSX_ENTRIES = ["xl/sharedStrings.xml", "xl/worksheets/sheet1.xml"]

const readZipEntries = (buffer, entryNames) =>
  new Promise((resolve, reject) => {
    const result = {}

    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipFile) => {
      if (err) {
        reject(err)
        return
      }

      zipFile.readEntry()

      zipFile.on("entry", entry => {
        if (!entryNames.includes(entry.fileName)) {
          zipFile.readEntry()
          return
        }

        zipFile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr) {
            reject(streamErr)
            return
          }

          const chunks = []

          readStream.on("data", chunk => chunks.push(chunk))
          readStream.on("end", () => {
            result[entry.fileName] = Buffer.concat(chunks).toString("utf8")

            if (entryNames.every(entryName => result[entryName])) {
              zipFile.close()
              resolve(result)
              return
            }

            zipFile.readEntry()
          })
          readStream.on("error", reject)
        })
      })

      zipFile.on("end", () => resolve(result))
      zipFile.on("error", reject)
    })
  })

const getCellValue = ($, cell, sharedStrings) => {
  const value = $(cell).find("v").text()

  if ($(cell).attr("t") === "s") {
    return sharedStrings[value] || ""
  }

  return value
}

const parseSharedStrings = xml => {
  const $ = cheerio.load(xml, { xmlMode: true })

  return $("si")
    .toArray()
    .map(node =>
      $(node)
        .find("t")
        .toArray()
        .map(textNode => $(textNode).text())
        .join("")
    )
}

const parseRows = (sheetXml, sharedStrings) => {
  const $ = cheerio.load(sheetXml, { xmlMode: true })

  return $("row")
    .toArray()
    .map(row =>
      $(row)
        .find("c")
        .toArray()
        .map(cell => getCellValue($, cell, sharedStrings))
    )
}

const parseHoldingsRows = async buffer => {
  const entries = await readZipEntries(buffer, XLSX_ENTRIES)

  if (!entries["xl/sharedStrings.xml"] || !entries["xl/worksheets/sheet1.xml"]) {
    throw new Error("Could not read SPY holdings XLSX")
  }

  const sharedStrings = parseSharedStrings(entries["xl/sharedStrings.xml"])
  const rows = parseRows(entries["xl/worksheets/sheet1.xml"], sharedStrings)
  const headerIndex = rows.findIndex(row => row.includes("Ticker") && row.includes("Weight"))

  if (headerIndex === -1) {
    throw new Error("Could not find SPY holdings XLSX header")
  }

  const headers = rows[headerIndex]
  const tickerIndex = headers.indexOf("Ticker")
  const weightIndex = headers.indexOf("Weight")

  return rows.slice(headerIndex + 1).map(row => ({
    ticker: row[tickerIndex],
    weight: row[weightIndex],
  }))
}

const fetchData = async () => {
  const response = await fetch(SPY_HOLDINGS_URL)

  if (!response.ok) {
    throw new Error(`Failed to fetch SPY holdings XLSX: ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const rows = await parseHoldingsRows(buffer)

  const result = rows
    .filter(row => isValidTicker(row.ticker) && row.weight)
    .map(row => [row.ticker, extractNumbers(row.weight)])

  return fromPairs(result)
}

exports.fetch = fetchData
