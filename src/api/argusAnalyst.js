const { getFidelitySecretUrl, prevSiblingTextIs, extractNumbers } = require("./util")
const fetchPdfData = require("../fetchPdfData")
const Logger = require("../Logger")
const { ReError } = require("../util")

/**
 * @param {string} ticker
 * @param {string} url
 * @param {Browser} browser
 * @returns {Promise<{argusAnalystOneYrDivGrowth:*, argusAnalystFiveYrEpsGrowth:*, argusAnalystRating:*, argusAnalystTarget:(number|string), argusAnalystFinancialStrength:*, argusAnalystOneYrEpsGrowth:*}>}
 */
const fetchArgusAnalyst = async (ticker, browser, analystPageLink, logger) => {
  if (!analystPageLink) {
    logger.warn("No Report!")
    return {}
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

exports.fetch = (ticker, browser, analystPageLink) => {
  const logger = new Logger(ticker, ARGUS_ANALYST)
  return fetchArgusAnalyst(ticker, browser, analystPageLink, logger).catch(error => {
    logger.logError(new ReError("fetch error! ", error))
    return { error }
  })
}
