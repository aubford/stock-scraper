const Cheerio = require("cheerio")
const fetch = require("node-fetch")
const { yahooModules } = require("./constants")

/**
 * @param fetchArgs
 * @returns {Promise<string>}
 */
const fetchText = async (...fetchArgs) => {
  const response = await fetch(...fetchArgs)
  return await response.text()
}

// MOODYS

exports.getMoodysLink = async (ticker, cookie) => {
  const text = await fetchText(
    "https://www.moodys.com/services/mdc-global?name=getTypeAheadResult",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,es;q=0.8",
        "content-type": "application/json",
        "sec-ch-ua": '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-lang": "en",
        cookie,
      },
      referrer:
        "https://www.moodys.com/credit-ratings/ATT-Inc-credit-rating-702550/reports?category=Ratings_and_Assessments_Reports_rc|Issuer_Reports_rc|Issuer_Data_Reports&type=Rating_Action_rc|Announcement_rc|Announcement_of_Periodic_Review_rc,Credit_Opinion_ir_rc,Peer_Snapshot_rc",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: `{"data":["${ticker}","en"]}`,
      method: "POST",
      mode: "cors",
    }
  )
  const data = JSON.parse(text).data.organizations[0]
  return data && data.ticker === ticker ? data : null
}

// WSJ

exports.fetchWSJData = async ticker => {
  const url = `https://www.wsj.com/market-data/quotes/${ticker}/research-ratings`
  try {
    const text = await fetchText(url)
    const $ = Cheerio.load(text)
    const html = $(".cr_analystRatings .data_data")
    return html
      .contents()
      .get()
      .map(node => node.data)
  } catch (err) {
    console.error("WSJ ERROR: ", err)
    return []
  }
}

// YAHOO

exports.fetchYahooData = async ticker => {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${yahooModules.join(
    ","
  )}`
  const text = await fetchText(url)
  return JSON.parse(text)
}

// ALPHA VANTAGE

const avApiKey = "1FSCTLZ457VMJH2F"
const avUrl = "https://www.alphavantage.co/query?function="
exports.fetchAlphaVantageData = async (ticker, func) => {
  const text = await fetchText(avUrl + func + "&symbol=" + ticker + "&apikey=" + avApiKey)
  return JSON.parse(text)
}

// IEX

const iexToken = "Tsk_05e3881c9446499bac9b6778ca0c2f8e"
exports.fetchIEXData = async (ticker, datum) => {
  const url = `https://sandbox.iexapis.com/stable/data-points/${ticker}/${datum}?token=${iexToken}`
  const text = await fetchText(url)
  return JSON.parse(text)
}
