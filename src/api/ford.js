const { prevSiblingTextIs } = require("./util")
const fetchPdfData = require("../fetchPdfData")
const Logger = require("../Logger")
const { formatErrorObject } = require("../util")
const { handleFetch } = require("./util/www")

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<{fordRating:(number|string), fordRelativeValuation:*, fordEarningsStrength:*, fordPriceMovement:*}>}
 */
const fetchData = async (ticker, browser) => {
  const [
    fordRatingSentence = "",
    fordEarningsStrength,
    fordRelativeValuation,
    fordPriceMovement,
  ] = await fetchPdfData({
    ticker,
    browser,
    analystName: FORD,
    url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=130&documenttag=${ticker}&c_name=invest_VENDOR`,
    xPathArr: [
      `//span[contains(text(),"We project that")]`,
      prevSiblingTextIs("Earnings Strength"),
      prevSiblingTextIs("Relative Valuation"),
      prevSiblingTextIs("Price Movement"),
    ],
    timeout: FORD_TIMEOUT,
  })

  const fordRating = fordRatingSentence
    ? [
        "will strongly outperform the market",
        "will outperform the market",
        "will perform in line with the market",
        "will underperform the market",
        "will strongly underperform the market",
      ].findIndex(str => fordRatingSentence.includes(str)) + 1 || "?"
    : ""

  return { fordRating, fordRelativeValuation, fordEarningsStrength, fordPriceMovement }
}

exports.fetch = (ticker, browser) =>
  handleFetch(() => fetchData(ticker, browser), ticker, "Ford.fetch")
