const fetch = require("node-fetch")
const _ = require("lodash")
const Cheerio = require("cheerio")

const buffetUrl = "https://dataroma.com/m/m_activity.php?m=BRK&typ=a"

const run = async () => {
  const res = await fetch(buffetUrl)
  const response = await res.text()

  const $ = Cheerio.load(response)

  const dataArr = $(`table#grid > tbody > tr`)
    .map((i, node) => [
      [
        $(node).children(`td.stock`).text().split(" - ")[0],
        ($(node).children(`td.buy`).text() || $(node).children(`td.sell`).text()).split(
          "%"
        )[0] + "%",
      ],
    ])
    .toArray()
    .slice(1)

  const chunk = dataArr.slice(
    0,
    _.findIndex(dataArr, val => val[0] === "" && val[1] === "")
  )
  return _.fromPairs(chunk)
}

run()
