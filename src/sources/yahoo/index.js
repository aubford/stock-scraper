const moment = require("moment")
const transform = require("./transform")
const { handleFetch, fetchText } = require("../util")
const { YAHOO_MODULES } = require("./util")
const {
  formatMsDate,
  getPreviousQuarterStartEndDates,
  MessageError,
  metaWriteOut,
} = require("../../util")

const { prevQtrEndDate, prevQtrStartDate } = getPreviousQuarterStartEndDates()

/**
 * @param ticker
 * @returns {Promise<any>}
 */
const fetchData = async ticker => {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?formatted=true&crumb=47pvnt0rqyG&lang=en-US&
    region=US&modules=summaryDetail&corsDomain=finance.yahoo.com`

  const headers = {
    accept: "*/*",
    referer: `https://finance.yahoo.com/quote/${ticker}/`,
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  }

  const text = await fetchText(url, { headers })
  const parsed = JSON.parse(text)
  return transform(parsed)
}

exports.fetch = ticker => handleFetch(() => fetchData(ticker), ticker, "YAHOO")

// this compensates for holidays
const getIndexOfDateOrPrevDateIfNotFound = (dates, date, iterations = 0) => {
  const index = dates.indexOf(date.format("M/D/YYYY"))
  return index === -1
    ? iterations < 4
      ? getIndexOfDateOrPrevDateIfNotFound(dates, date.subtract(1, "day"), iterations + 1)
      : null
    : index
}

const fetchPrices = async ticker => {
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
  const rawDates = data.timestamp.map(date => formatMsDate(date * 1000)).reverse()
  const rawPrices = data.indicators.quote[0].close.reverse()

  // Filter out null prices and their corresponding dates
  const datePricePairs = rawDates.map((date, i) => [date, rawPrices[i]]).filter(([_, price]) => price !== null)
  const dates = datePricePairs.map(([date]) => date)
  const prices = datePricePairs.map(([_, price]) => price.toFixed(2))

  const indexOfJan152020 = dates.indexOf("1/15/2020")

  const todayDate = moment().format("M/D/YYYY")
  if (dates[0] === todayDate) {
    dates.shift()
    prices.shift()
  }

  const prevQtrStartDateIndex = getIndexOfDateOrPrevDateIfNotFound(dates, prevQtrStartDate)

  const prevQtrEndDateIndex = getIndexOfDateOrPrevDateIfNotFound(dates, prevQtrEndDate)

  if (!prevQtrStartDateIndex || !prevQtrEndDateIndex) {
    throw new MessageError("Prev Qtr Start or End Date not found", "fetchPrices")
  }

  const qtrPrices = prices
    .slice(prevQtrEndDateIndex, prevQtrStartDateIndex)
    .map(price => parseFloat(price))
  const yahooPrevQtrAvgPrice = qtrPrices.reduce((a, b) => a + b, 0) / qtrPrices.length

  const prevQtrMaxPrice = Math.max(...qtrPrices)
  const prevQtrMinPrice = Math.min(...qtrPrices)

  const yahooDailyPricesDates = dates.slice(0, indexOfJan152020)
  const yahooDailyPrices = prices.slice(0, indexOfJan152020)

  if (yahooDailyPricesDates.length !== yahooDailyPrices.length) {
    throw new MessageError(
      "Prices and dates are not the same length!",
      "fetchHistoricalPrices:fetchPrices"
    )
  }

  return {
    yahooPrevQtrAvgPrice,
    yahooPrevQtrRange: `${prevQtrMinPrice} - ${prevQtrMaxPrice}`,
    yahooDailyPricesDates,
    yahooDailyPrices,
  }
}

/**
 * Get the voo index prices so we can use them to compare against other stocks
 * @param {boolean} [noWriteOut]
 * @returns {Promise<{yahooPrevQtrAvgPrice: number, yahooPrevQtrRange: string, yahooDailyPricesDates: string[], yahooDailyPrices: string[]}>}
 */
exports.fetchVooIndexHistoricalPrices = async noWriteOut => {
  const data = await handleFetch(() => fetchPrices("VOO"), "VOO", "YAHOO PRICES")
  global.vooHistoricalPricesData = data

  if (!noWriteOut) {
    metaWriteOut({ vooIndexHistoricalPrices: data })
  }

  return data
}

const fetchStockPrices = async (_, ticker) => {
  if (!global.vooHistoricalPricesData) {
    throw new MessageError(
      "fetchVooIndexHistoricalPrices must be called before calling fetchHistoricalPrices",
      "fetchStockPrices"
    )
  }

  const { yahooPrevQtrAvgPrice, yahooPrevQtrRange, yahooDailyPricesDates, yahooDailyPrices } =
    await fetchPrices(ticker)

  // Compensate for stocks that recently went IPO
  const vooPrices = global.vooHistoricalPricesData.yahooDailyPricesDates.slice(
    0,
    yahooDailyPricesDates.length
  )

  const someDatesMissing = vooPrices.some(date => !yahooDailyPricesDates.includes(date))
  if (someDatesMissing) {
    throw new MessageError("Some dates missing relative to VOO data", "fetchStockPrices")
  }

  return {
    yahooPrevQtrAvgPrice,
    yahooPrevQtrRange,
    yahooDailyPricesDates,
    yahooDailyPrices,
  }
}

exports.fetchHistoricalPrices = async ticker =>
  await handleFetch(fetchStockPrices, ticker, "YAHOO PRICES")
