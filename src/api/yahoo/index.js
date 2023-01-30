const { fetchText } = require("../util")
const transform = require("./transform")
const { formatMsDate } = require("../../util")

/**
 * @param ticker
 * @returns {Promise<any>}
 */
exports.fetch = async ticker => {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${YAHOO_MODULES.join(
    ","
  )}`
  const text = await fetchText(url)
  const parsed = JSON.parse(text)
  return transform(parsed)
}

exports.fetchHistoricalPrices = async ticker => {
  const res = await fetchText(
    "https://query1.finance.yahoo.com/v8/finance/chart/VOO?region=US&lang=en-US&includePrePost=false&interval=1d&useYfid=true&range=5y&corsDomain=finance.yahoo.com&.tsrc=finance",
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua": '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        Referer: `https://finance.yahoo.com/quote/${ticker}/`,
        "Referrer-Policy": "no-referrer-when-downgrade",
      },
      method: "GET",
    }
  )

  const data = JSON.parse(res).chart.result[0]
  return {
    yahooDailyPricesDates: data.timestamp.map(date => formatMsDate(date * 1000)).reverse(),
    yahooDailyPrices: data.indicators.quote[0].close.map(price => price.toFixed(2)).reverse(),
  }
}
