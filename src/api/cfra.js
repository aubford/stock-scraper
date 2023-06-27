const { prevSiblingTextContains, extractNumbers } = require("./util")
const { makePrettyDate } = require("../util")
const Logger = require("../Logger")
const fetchPdfData = require("../fetchPdfData")
const { handleFetch } = require("./util/www")

const hasCFRA = (rating, ticker, analystName) => {
  const hasReport = rating !== "no rating"
  if (!hasReport) {
    new Logger(ticker, analystName).warn(`NO REPORT`)
  }
  return hasReport
}

const prevSiblingTextContainsForCfra = text =>
  `//span[contains(text(),"${text}")]/../following-sibling::span[1]/span`

/**
 * @param {string} ticker
 * @param {string} cfraRating
 * @param {string} cfraLink
 * @param {Browser} browser
 * @returns {Promise<{cfraTarget:string, cfraFairValue:*, cfraUpdatedAt:(*|string), cfraDate:*}>}
 */
const fetchData = async (ticker, cfraRating, cfraLink, browser) => {
  const [cfraTargetStr, [, , , cfraFairValue], cfraDate] = hasCFRA(cfraRating, ticker, "CFRA")
    ? await fetchPdfData({
        ticker,
        browser,
        analystName: CFRA,
        url: cfraLink,
        xPathArr: [
          prevSiblingTextContainsForCfra("12-Mo. Target Price"),
          prevSiblingTextContainsForCfra("Calculation", 2),
          prevSiblingTextContains("Analysis prepared by", 4),
        ],
        waitForPostScroll: prevSiblingTextContainsForCfra("Calculation", 2),
        timeout: CFRA_TIMEOUT,
      })
    : []

  return {
    cfraTarget: extractNumbers(cfraTargetStr),
    cfraFairValue,
    cfraDate: cfraDate.split(" ").slice(1, 4).join(" "),
    cfraUpdatedAt: makePrettyDate(),
  }
}

exports.fetch = (ticker, cfraRating, cfraLink, browser) =>
  handleFetch(() => fetchData(ticker, cfraRating, cfraLink, browser), ticker, CFRA)
