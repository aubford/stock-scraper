const Logger = require("../Logger")
const { prevSiblingTextContains, extractNumbers } = require("./util")
const { makePrettyDate } = require("../util")
const fetchPdfData = require("../fetchers/fetchPdfData")
const { handleFetch } = require("./util/www")

const prevSiblingTextContainsForCfra = text =>
  `//span[contains(text(),"${text}")]/../following-sibling::span[1]/span`

/**
 * @param {string} ticker
 * @param {string} cfraRating
 * @param {string} cfraLink
 * @param {Browser} browser
 * @returns {Promise<{cfraTarget:string, cfraFairValue: string, cfraUpdatedAt: string, cfraDate: string}>}
 */
const fetchData = async (ticker, cfraRating, cfraLink, browser) => {
  const noCFRACoverage = cfraRating === "no rating"

  if (noCFRACoverage) {
    new Logger(ticker, "CFRA").log(`NO REPORT OR RATING`)
    return {
      cfraTarget: "",
      cfraFairValue: "",
      cfraDate: "",
      cfraUpdatedAt: makePrettyDate(),
    }
  }

  const [cfraTargetStr, [, cfraFairValue] = [], cfraDate] = await fetchPdfData({
    ticker,
    browser,
    analystName: CFRA,
    url: cfraLink,
    xPathArr: [
      prevSiblingTextContainsForCfra("12-Mo. Target Price"),
      prevSiblingTextContainsForCfra("Calculation", 2),
      prevSiblingTextContains("Stock Report Front|", 2),
    ],
    waitForPostScroll: prevSiblingTextContainsForCfra("Calculation", 2),
    timeout: CFRA_TIMEOUT,
  })

  return {
    cfraTarget: extractNumbers(cfraTargetStr),
    cfraFairValue,
    cfraDate: cfraDate ? cfraDate.split(" ").slice(1, 4).join(" ") : "",
    cfraUpdatedAt: makePrettyDate(),
  }
}

/**
 * @param {string} ticker
 * @param {string} cfraRating
 * @param {string} cfraLink
 * @param {Browser} browser
 * @returns {Promise<{cfraTarget:string, cfraFairValue: string, cfraUpdatedAt: string, cfraDate: string}>}
 */
exports.fetch = (ticker, cfraRating, cfraLink, browser) => {
  return handleFetch(() => fetchData(ticker, cfraRating, cfraLink, browser), ticker, "CFRA")
}
