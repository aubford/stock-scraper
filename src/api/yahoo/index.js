const { fetchText } = require("../util")
const transform = require("./transform")
const { formatMsDate, getPreviousQuarterStartEndDates } = require("../../util")
const { handleFetch } = require("../util/www")

const { prevQtrEndDate, prevQtrStartDate } = getPreviousQuarterStartEndDates()

/**
 * @param ticker
 * @returns {Promise<any>}
 */
const fetchData = async ticker => {
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?formatted=true&crumb=47pvnt0rqyG&lang=en-US&
    region=US&modules=${YAHOO_MODULES.join(",")}&corsDomain=finance.yahoo.com`

  const headers = {
    authority: "query2.finance.yahoo.com",
    accept: "*/*",
    "accept-language": "en-US,en;q=0.9",
    cookie: `GUC=AQEBCAFksvxk5kIaXAP3&s=AQAAAB8Z3HN7&g=ZLGrgw; A1=d=AQABBLOY6WMCEMhuu3C-Fi8rBgsnmUiasHAFEgEBCAH8smTmZNwr0iMA_eMBAAcIs5jpY0iasHA&S=AQAAAgBA6SZJ8psOFc_1xpYQHYs; A3=d=AQABBLOY6WMCEMhuu3C-Fi8rBgsnmUiasHAFEgEBCAH8smTmZNwr0iMA_eMBAAcIs5jpY0iasHA&S=AQAAAgBA6SZJ8psOFc_1xpYQHYs; A1S=d=AQABBLOY6WMCEMhuu3C-Fi8rBgsnmUiasHAFEgEBCAH8smTmZNwr0iMA_eMBAAcIs5jpY0iasHA&S=AQAAAgBA6SZJ8psOFc_1xpYQHYs&j=US; cmp=t=1689625511&j=0&u=1YNN; gpp=DBABBg~BVoIgACA.QA; gpp_sid=8; PRF=t%3D${ticker}%26newChartbetateaser%3D0%252C1690835111451; gam_id=y-ZHBu0pJE2uIGFFZh15bXOM6urixU3I2h~A; tbla_id=d59288aa-4fa7-40a8-a9d9-4ccb6155cd77-tuctae31e33`,
    dnt: "1",
    origin: "https://finance.yahoo.com",
    referer: `https://finance.yahoo.com/quote/${ticker}/`,
    "sec-ch-ua": '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  }

  const text = await fetchText(url, { headers })
  const parsed = JSON.parse(text)
  return transform(parsed)
}

exports.fetch = ticker => handleFetch(() => fetchData(ticker), ticker, YAHOO)

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
  const dates = data.timestamp.map(date => formatMsDate(date * 1000)).reverse()
  const prices = data.indicators.quote[0].close.map(price => price.toFixed(2)).reverse()
  const indexOfJan152020 = dates.indexOf("1/15/2020")

  // may need to adjust this for holidays in the future!!
  const prevQtrStartDateIndex = dates.indexOf(prevQtrStartDate.format("M/D/YYYY"))
  const prevQtrEndDateIndex = dates.indexOf(prevQtrEndDate.format("M/D/YYYY")) + 1

  const qtrPrices = prices
    .slice(prevQtrEndDateIndex, prevQtrStartDateIndex)
    .map(price => parseFloat(price))
  const yahooPrevQtrAvgPrice = qtrPrices.reduce((a, b) => a + b, 0) / qtrPrices.length

  const prevQtrMaxPrice = Math.max(...qtrPrices)
  const prevQtrMinPrice = Math.min(...qtrPrices)

  return {
    yahooPrevQtrAvgPrice,
    yahooPrevQtrRange: `${prevQtrMinPrice} - ${prevQtrMaxPrice}`,
    yahooDailyPricesDates: dates.slice(0, indexOfJan152020),
    yahooDailyPrices: prices.slice(0, indexOfJan152020),
  }
}

exports.fetchHistoricalPrices = ticker =>
  handleFetch(() => fetchPrices(ticker), ticker, YAHOO_PRICES)
