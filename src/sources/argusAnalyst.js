const { getFidelitySecretUrl, prevSiblingTextIs, extractNumbers } = require("./util")
const fetchPdfData = require("../fetchers/fetchPdfData")
const { WarnError } = require("../util")
const { handleFetch } = require("./util/www")

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @param {string} analystPageLink
 * @returns {Promise<{argusAnalystOneYrDivGrowth:*, argusAnalystFiveYrEpsGrowth:*, argusAnalystRating:*, argusAnalystTarget:(number|string), argusAnalystFinancialStrength:*, argusAnalystOneYrEpsGrowth:*}>}
 */
const fetchArgusAnalyst = async (ticker, browser, analystPageLink) => {
  if (!analystPageLink) {
    throw new WarnError("No Argust Analyst Report!", "fetchArgusAnalyst")
  }

  const url = await getFidelitySecretUrl(analystPageLink, browser, ticker)

  const [
    argusAnalystRating,
    argusAnalystTargetStr,
    argusAnalystFinancialStrength,
    argusAnalystOneYrEpsGrowth,
    argusAnalystFiveYrEpsGrowth,
    argusAnalystOneYrDivGrowth,
  ] = await fetchPdfData({
    ticker,
    browser,
    analystName: "ARGUS",
    url,
    xPathArr: [
      prevSiblingTextIs("ARGUS RATING: ", 2),
      prevSiblingTextIs("Target Price", 2),
      prevSiblingTextIs("Financial Strength Rating", 2),
      prevSiblingTextIs("1 Year EPS Growth Forecast"),
      prevSiblingTextIs("5 Year EPS Growth Forecast"),
      prevSiblingTextIs("1 Year Dividend Growth Forecast"),
    ],
    timeout: ARGUS_ANALYST_TIMEOUT,
  })

  const argusAnalystTarget = argusAnalystTargetStr
    ? argusAnalystTargetStr.includes("Thousand")
      ? extractNumbers(argusAnalystTargetStr) * 1000
      : extractNumbers(argusAnalystTargetStr)
    : ""

  return {
    argusAnalystRating: argusAnalystRating || argusAnalystRating[3],
    argusAnalystFinancialStrength,
    argusAnalystOneYrEpsGrowth,
    argusAnalystFiveYrEpsGrowth,
    argusAnalystOneYrDivGrowth,
    argusAnalystTarget,
  }
}

exports.fetch = (ticker, browser, analystPageLink) =>
  handleFetch(() => fetchArgusAnalyst(ticker, browser, analystPageLink), ticker, "ARGUS")

// skip for now
exports.fetch = () => ({})
