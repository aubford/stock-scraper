const Logger = require("../util/Logger")
const { extractNumbers } = require("./util")
const { makePrettyDate } = require("../util")
const fetchPdfData = require("../fetchers/fetchPdfData")
const { handleFetch } = require("./util/www")

/**
 * @param {string} text
 * @returns {{cfraTargetStr: string, cfraDate: string}}
 */
const parseCfraText = text => {
  const targetMatch = text.match(/12-Month Target Price\s+(USD\s*[\d,]+\.?\d*)/i)
  const dateMatch = text.match(/(?:Quantitative )?Stock Report\s*\|\s*([^|]+?)\s*\|/i)
  return {
    cfraTargetStr: targetMatch ? targetMatch[1] : "",
    cfraDate: dateMatch ? dateMatch[1].trim() : "",
  }
}

/**
 * @param {string} ticker
 * @param {string} cfraRating
 * @param {string} cfraLink
 * @param {Browser} browser
 * @returns {Promise<{cfraTarget:string, cfraFairValue: string, cfraUpdatedAt: string, cfraDate: string}>}
 */
const fetchData = async (ticker, cfraRating, cfraLink, browser) => {
  const noCFRACoverage = cfraRating === "no rating"

  if (noCFRACoverage || !cfraLink) {
    new Logger(ticker, "CFRA").log(`NO REPORT OR RATING`)
    return {
      cfraTarget: "",
      cfraFairValue: "",
      cfraDate: "",
      cfraUpdatedAt: makePrettyDate(),
    }
  }

  const { cfraTargetStr, cfraDate } = await fetchPdfData({
    ticker,
    browser,
    analystName: "CFRA",
    url: cfraLink,
    timeout: CFRA_TIMEOUT,
    extract: parseCfraText,
  })

  return {
    cfraTarget: extractNumbers(cfraTargetStr),
    cfraFairValue: "",
    cfraDate,
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
exports.parseCfraText = parseCfraText
