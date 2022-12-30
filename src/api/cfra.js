const makeScrapeTools = require("../makeScrapeTools")
const { prevSiblingTextContains, extractNumbers } = require("./util")
const { makePrettyDate } = require("../util")
const Logger = require("../Logger")

const hasCFRA = (rating, ticker, analystName) => {
  const hasReport = rating !== "no rating"
  if (!hasReport) {
    new Logger(ticker, analystName).warn(`NO REPORT`)
  }
  return hasReport
}

/**
 * @param {string} ticker
 * @param {string} cfraRating
 * @param {string} cfraLink
 * @param {Browser} browser
 * @returns {Promise<{cfraTarget:string, cfraFairValue:*, cfraUpdatedAt:(*|string), cfraDate:*}>}
 */
exports.fetch = async (ticker, cfraRating, cfraLink, browser) => {
  const { fetchPdfData } = makeScrapeTools(ticker, browser)

  const [cfraTargetStr, cfraFairValue, cfraDate] = hasCFRA(cfraRating, ticker, "CFRA")
    ? await fetchPdfData({
        analystName: CFRA,
        url: cfraLink,
        xPathArr: [
          prevSiblingTextContains("12-Mo.  Target  Price"),
          prevSiblingTextContains("Calculation", 2),
          prevSiblingTextContains("Analysis prepared by", 3),
        ],
        waitForPostScroll: prevSiblingTextContains("Calculation", 2),
        timeout: CFRA_TIMEOUT,
      })
    : []

  return {
    cfraTarget: extractNumbers(cfraTargetStr),
    cfraFairValue,
    cfraDate,
    cfraUpdatedAt: makePrettyDate(),
  }
}
