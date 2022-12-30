const { fetchText } = require("../util")
const transform = require("./transform")

/**
 * @param ticker
 * @returns {Promise<any>}
 */
exports.fetch = async ticker => {
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${YAHOO_MODULES.join(
    ","
  )}`
  const text = await fetchText(url)
  const parsed = JSON.parse(text)
  return transform(parsed)
}
