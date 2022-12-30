const makeScrapeTools = require("../makeScrapeTools")
const { prevSiblingTextIs, extractNumbers } = require("./util")
const { getFidelitySecretUrl } = require("./util/www")

/**
 * @param {string} ticker
 * @param {string} url
 * @param {Browser} browser
 * @returns {Promise<{argusAnalystOneYrDivGrowth:*, argusAnalystFiveYrEpsGrowth:*, argusAnalystRating:*, argusAnalystTarget:(number|string), argusAnalystFinancialStrength:*, argusAnalystOneYrEpsGrowth:*}>}
 */
exports.fetch = async (ticker, browser, analystPageLink) => {
  const { fetchPdfData } = makeScrapeTools(ticker, browser)
  const url = await getFidelitySecretUrl(analystPageLink, browser, ticker)

  const [
    argusAnalystRating,
    argusAnalystTargetStr,
    argusAnalystFinancialStrength,
    argusAnalystOneYrEpsGrowth,
    argusAnalystFiveYrEpsGrowth,
    argusAnalystOneYrDivGrowth,
  ] = await fetchPdfData({
    analystName: ARGUS_ANALYST,
    url,
    xPathArr: [
      prevSiblingTextIs("ARGUS RATING: "),
      prevSiblingTextIs("Target Price"),
      prevSiblingTextIs("Financial Strength Rating"),
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
    argusAnalystRating,
    argusAnalystFinancialStrength,
    argusAnalystOneYrEpsGrowth,
    argusAnalystFiveYrEpsGrowth,
    argusAnalystOneYrDivGrowth,
    argusAnalystTarget,
  }
}
