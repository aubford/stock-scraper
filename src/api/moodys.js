const { fetchText } = require("./util")
const Logger = require("../Logger")
const { getPageCookies } = require("../puppeteer")
const PageDataFetcher = require("../PageDataFetcher")
const { ReError, MessageError } = require("../util")

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
  const { data } = JSON.parse(text)
  if (data.ticker) {
    return `/search?keyword=${ticker}`
  }
  const org = data.organizations.find(org => org.ticker === ticker)
  const link = org?.link
  if (!link) {
    throw new MessageError(`No moodysLink found`).setCode(404)
  }
  return link
}

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns Promise<Object>
 */
const fetchMoodys = async (ticker, browser, logger) => {
  const moodysCookies = await getPageCookies(browser, "https://www.moodys.com/")
  const moodysLink = await getMoodysLink(ticker, moodysCookies)

  const moodysFetcher = new PageDataFetcher("Moody's PageDataFetcher", ticker, browser, {
    timeout: MOODYS_TIMEOUT,
  })
  await moodysFetcher.setPage(`https://www.moodys.com${moodysLink}`)
  const [moodysRating, moodysOutlook] = await moodysFetcher.fetchPageData(
    [
      "//span[contains(text(),'LONG TERM RATING') or contains(text(),'LONG TERM DEBT')]/following-sibling::div[1]/a/div",
      "//span[contains(text(),'OUTLOOK')]/following-sibling::div[1]/a/div",
    ],
    `//div[@class="mis-ratings-container"]`
  )
  await moodysFetcher.close()
  return {
    moodysRating,
    moodysOutlook,
    moodysLink,
  }
}

exports.fetch = (ticker, browser) => {
  const logger = new Logger(ticker, "Moody's")
  return fetchMoodys(ticker, browser, logger).catch(error => {
    if (error.code === 404) {
      logger.warn(error.message)
      return {}
    }

    logger.error("fetch error:", error)
    return { error }
  })
}
