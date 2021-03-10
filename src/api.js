const Cheerio = require("cheerio")
const { getFidelitySecretUrl, prevSiblingTextContains, prevSiblingTextIs } = require("./util")

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
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${YAHOO_MODULES.join(
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

// NEW CONSTRUCTS

exports.fetchNewConstructs = async (ticker, fetchPdfData) => {
  const [ncRating, [ncRatingB, ncRoic, ncFCF, ncEps, ncGap, ncPB] = []] = await fetchPdfData({
    analystName: NEW_CONSTRUCTS,
    url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
    xPathArr: [
      prevSiblingTextContains("(MM)"),
      `//span[text()="1 - Very Attractive" or text()="2 - Attractive" or text()="3 - Neutral"  or text()="4 - Unattractive" or text()="5 - Very Unattractive"]`,
    ],
    waitForPostScroll: `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]`,
  })

  if (ncRating !== ncRatingB) {
    console.error("New Constructs rating mismatch!!!!!!")
    return {}
  }

  return {
    ncEps,
    ncFCF,
    ncGap,
    ncPB,
    ncRating,
    ncRoic,
  }
}

exports.fetchZacks = async (ticker, fetchPdfData, url) => {
  const [
    zacksRank,
    zacksTarget,
    zacksRecommendation,
    zacksVGM,
    zacksValue,
    zacksGrowth,
    zacksMomentum,
    zacksIndustryRank,
  ] = await fetchPdfData({
    analystName: ZACKS,
    url,
    xPathArr: [
      `//span[text()="Zacks Style Scores:" or text()="Zacks Rank: "]/following-sibling::span[position()=1 and not(text()="(1-5)")]`,
      prevSiblingTextIs("Price Target (6-12 Months): "),
      prevSiblingTextIs("Zacks Recommendation:", 4),
      prevSiblingTextIs(`VGM:`),
      `//*[@id="viewer"]//span[contains(text(),"Value: ")]`,
      `//*[@id="viewer"]//span[contains(text(),"Growth: ")]`,
      `//*[@id="viewer"]//span[contains(text(),"Momentum: ")]`,
      prevSiblingTextIs(`Zacks Industry Rank`),
    ],
  })

  return {
    zacksRank,
    zacksTarget,
    zacksRecommendation,
    zacksVGM,
    zacksValue,
    zacksGrowth,
    zacksMomentum,
    zacksIndustryRank,
  }
}
