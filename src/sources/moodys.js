const { fetchText } = require("./util")
const { getPageCookies } = require("../util/puppeteer-utils")
const PageDataFetcher = require("../fetchers/PageDataFetcher")
const { WarnError, ReError, getStockDataFile, readJsonFile } = require("../util")
const { handleFetch } = require("./util/www")

/**
 * @param {string} ticker
 * @param {Object} cookie
 * @param {string} name
 * @returns {Promise<*|null>}
 */
const getMoodysLinks = async (ticker, cookie, name) => {
  const stockData = getStockDataFile()
  const vooData = readJsonFile(VOO_LOCATION)

  const existingMoodysLink = stockData[ticker]?.moodysLink || vooData[ticker]?.moodysLink

  if (existingMoodysLink) {
    return [existingMoodysLink]
  }

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
      body: `{"data":["${name}","en"]}`,
      method: "POST",
      mode: "cors",
    }
  )

  let data
  try {
    data = JSON.parse(text).data
  } catch (err) {
    throw new ReError("Moody's blocked!", err, "getMoodysLink")
  }

  const links = data.organizations
    .filter(org => org.ticker === ticker && org.link)
    .map(org => org.link)
  if (!links.length) {
    throw new WarnError(`No moodysLink found`, "getMoodysLink")
  }
  return links
}

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @param {object} logger
 * @param {string} [stockName]
 * @returns Promise<Object>
 */
const fetchData = async (ticker, browser, logger, stockName) => {
  const moodysFetcher = new PageDataFetcher(ticker, browser, logger, {
    timeout: MOODYS_TIMEOUT,
  })
  const cookie = await getPageCookies(browser, "https://www.moodys.com/")
  const moodysLinks = await getMoodysLinks(ticker, cookie, stockName || ticker)

  let moodysLink = ""
  const fetchMoodysRecurse = async () => {
    if (!moodysLinks.length) {
      throw new WarnError("No moodysLink found", "fetchMoodysRecurse")
    }
    moodysLink = moodysLinks.pop()

    await moodysFetcher.setPage(`https://www.moodys.com${moodysLink}`)
    try {
      return await moodysFetcher.fetchPageData(
        [
          `//div[@id='rating-table']//table//tr[1]/td[2]/div/text()`,
          `//div[@id='rating-table']//table//tr[1]/td[@data-index='rating_rank']/div/text()`,
          `//div[@id='rating-table']//table//tr[1]/td[@data-index='rating_outlook']/div/text()`,
          `//div[@id='rating-table']//table//tr[1]/td[@data-index='rating_date']/div/text()`,
        ],
        "//div[@id='rating-table']"
      )
    } catch (error) {
      logger.warn("Moodys failed for link: " + moodysLink)
      return await fetchMoodysRecurse()
    }
  }

  const [moodysRating, moodysOutlook, moodysDate] = await fetchMoodysRecurse()
  await moodysFetcher.close()
  return {
    moodysRating,
    moodysOutlook,
    moodysDate,
    moodysLink,
  }
}

// skip for now
exports.fetch = () => ({})
// exports.fetch = (ticker, browser, stockName) =>
//   handleFetch(logger => fetchData(ticker, browser, logger, stockName), ticker, "MOODYS")
