const addDays = (incomingDate, daysToAdd) => {
  const newDate = new Date(incomingDate)
  return new Date(newDate.setDate(newDate.getDate() + daysToAdd))
}

const dateStrIsBefore = (dateStr, daysToAdd) =>
  Boolean(new Date(dateStr) < addDays(new Date(), daysToAdd))


const arkkIntegrityTest = arkkDataRows => {
  const isOlderThanFiveDays = dateStrIsBefore(last(last(arkkDataRows))[2], -5)
  if (isOlderThanFiveDays) {
    throw new Error("ARKK integrity test failure: Is older than 5 days")
  }
  const dates = arkkDataRows.map(row => new Date(row[0][2]))
  const sorted = sortBy([...dates])
  if (!isEqual(dates, sorted)) {
    throw new Error("ARKK integrity test failure: Bad sort order")
  }
}

const getArkkTableRows = html => {
  const $ = Cheerio.load(html)
  return $("table tr")
    .map((i, tr) =>
      $(tr)
        .children("td")
        .map((i, td) => $(td).text())
    )
    .toArray()
    .map(row => row.get())
    .slice(1)
}

function getArkkChart() {
  const res = CacheService.getScriptCache().get("arkkTable")
  const parsed = JSON.parse(res)
  const flat = flatten(parsed)
  const sorted = sortBy(flat, ["2", "3"]).reverse()
  return sorted.filter(dateData => dateData[5])
}

function getArkkWeightings() {
  const urls = [
    "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_INNOVATION_ETF_ARKK_HOLDINGS.csv",
    "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_NEXT_GENERATION_INTERNET_ETF_ARKW_HOLDINGS.csv",
    "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_AUTONOMOUS_TECHNOLOGY_&_ROBOTICS_ETF_ARKQ_HOLDINGS.csv",
    "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_GENOMIC_REVOLUTION_MULTISECTOR_ETF_ARKG_HOLDINGS.csv",
    "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_FINTECH_INNOVATION_ETF_ARKF_HOLDINGS.csv",
    "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_SPACE_EXPLORATION_&_INNOVATION_ETF_ARKX_HOLDINGS.csv",
    "https://ark-funds.com/wp-content/fundsiteliterature/csv/THE_3D_PRINTING_ETF_PRNT_HOLDINGS.csv",
    "https://ark-funds.com/wp-content/fundsiteliterature/csv/ARK_ISRAEL_INNOVATIVE_TECHNOLOGY_ETF_IZRL_HOLDINGS.csv",
  ]
  const fundData = flatten(
    urls.map(datum => Utilities.parseCsv(
      UrlFetchApp.fetch(datum).getContentText()
    ).slice(1))
  )

  const res = fundData.reduce((acc, curr) => {
    const ticker = curr[3]
    const fund = curr[1]
    const weight = curr[7]
    const prev = acc[ticker] || ""
    return {
      ...acc,
      [ticker]: `${fund}: ${weight} ` + prev
    }
  }, {})

  return res
}

function getArkkData() {
  const threads = GmailApp.search("from:ark@ark-funds.com")
  const tableRows = threads.map(thread => getArkkTableRows(thread.getMessages()[0].getBody())).reverse()
  CacheService.getScriptCache().put("arkkTable", JSON.stringify(tableRows))
  const arkkPct = getArkkWeightings()

  arkkIntegrityTest(tableRows)

  const tickers = uniq(flatten(tableRows).map(row => row[4]))
  

  const arkkData = tickers.reduce((arkkData, ticker) => ({
    ...arkkData,
    [ticker]: {
      arkkPct: arkkPct[ticker] || "",
      arkkChange: tableRows.reduce((acc, row) => {
        const tickerRow = row.find(r => r[4] === ticker)
        if (!tickerRow) {
          return acc
        }
        return tickerRow[8]
      }, 0),
      arkkChart: tableRows.map(row => {
        const tickerRow = row.find(r => r[4] === ticker)
        if (!tickerRow) {
          return 0
        }
        const buySell = tickerRow[3]
        return buySell === "Buy" ? tickerRow[7] : "-" + tickerRow[7]
      })
    }
  }), {})

  return arkkData
}
