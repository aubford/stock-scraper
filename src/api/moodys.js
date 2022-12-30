const makeScrapeTools = require("../makeScrapeTools")
const { fetchText } = require("./util")
const Logger = require("../Logger")

/**
 * @param {string} ticker
 * @param {Object} cookie
 * @returns {Promise<*|null>}
 */
const getMoodysLink = async (ticker, cookie) => {
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
  try {
    const { data } = JSON.parse(text)
    if (data.ticker) {
      return `/search?keyword=${ticker}`
    }
    const org = data.organizations.find(org => org.ticker === ticker)
    return org ? org.link : null
  } catch (error) {
    return null
  }
}

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns Promise<Object>
 */
exports.fetch = async (ticker, browser) => {
  const { getPageCookies, getPageDataFetcher } = makeScrapeTools(ticker, browser)

  const logger = new Logger(ticker, "Moodys")

  const moodysCookies = await getPageCookies("https://www.moodys.com/")
  const moodysLink = await getMoodysLink(ticker, moodysCookies)

  if (moodysLink) {
    const moodysFetcher = getPageDataFetcher("moodys", { timeout: MOODYS_TIMEOUT })
    await moodysFetcher.setPage(`https://www.moodys.com${moodysLink}`)
    const moodysData = await moodysFetcher.fetchPageData(
      [
        "//span[contains(text(),'LONG TERM RATING') or contains(text(),'LONG TERM DEBT')]/following-sibling::div[1]/a/div",
        "//span[contains(text(),'OUTLOOK')]/following-sibling::div[1]/a/div",
      ],
      `//div[@class="mis-ratings-container"]`
    )
    await moodysFetcher.close()
    return [...moodysData, moodysLink]
  } else {
    logger.warn("No Moodys link")
    return []
  }
}
