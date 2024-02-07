const JsDomFetcher = require("../fetchers/JsDomFetcher")
const { fromPairs } = require("lodash")
const { extractNumbers } = require("./util")

const fetchData = async () => {
  const fetcher = new JsDomFetcher("Zacks", "SP500")

  await fetcher.setPage(`https://www.slickcharts.com/sp500`)

  const rows = fetcher.$$x(`(//tbody[1])[1]/tr`)

  const result = rows.map(row => {
    const cells = row.getTextArrByX(`td`)
    return [cells[2], extractNumbers(cells[3])]
  })

  return fromPairs(result)
}

exports.fetch = fetchData
