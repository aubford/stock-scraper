const { fetchText } = require("../util")
const transform = require("./transform")
const { formatMsDate, ReError, formatErrorObject } = require("../../util")
const Logger = require("../../Logger")

/**
 * @param ticker
 * @returns {Promise<any>}
 */
const fetchYahoo = async ticker => {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${YAHOO_MODULES.join(
    ","
  )}`
  const text = await fetchText(url)
  const parsed = JSON.parse(text)
  return transform(parsed)
}

exports.fetch = ticker => {
  const logger = new Logger(ticker, "Yahoo")
  return fetchYahoo(ticker).catch(e => {
    const error = new ReError("fetch error!", e, "yahoo.fetch")
    logger.logError(error)
    return formatErrorObject(error)
  })
}

const fetchHistoricalPrices = async ticker => {
  const res = await fetchText(
    `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?region=US&lang=en-US&includePrePost=false&interval=1d&useYfid=true&range=5y&corsDomain=finance.yahoo.com&.tsrc=finance`,
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
  const dates = data.timestamp.map(date => formatMsDate(date * 1000)).reverse()
  const prices = data.indicators.quote[0].close.map(price => price.toFixed(2)).reverse()
  const indexOfJan152020 = dates.indexOf("1/15/2020")

  return {
    yahooDailyPricesDates: dates.slice(0, indexOfJan152020),
    yahooDailyPrices: prices.slice(0, indexOfJan152020),
  }
}

exports.fetchHistoricalPrices = ticker => {
  const logger = new Logger(ticker, "Yahoo Historical Prices")
  return fetchHistoricalPrices(ticker, logger).catch(error => {
    logger.logError(error)
    return {
      yahooDailyPricesDates: error.message,
      yahooDailyPrices: error.message,
      ...formatErrorObject(error),
    }
  })
}
