const { prevSiblingTextIs, followingSiblingTextIs } = require("./util")
const fetchPdfData = require("../fetchPdfData")

/**
 * @param {string} ticker
 * @param {string} url
 * @param {Browser} browser
 * @returns {Promise<{morningstarFairValue:*, morningstarUncertainty:*, morningstarDate:*, morningstarCapitalAllocation:*, morningstarMoat:*}>}
 */
exports.fetch = async (ticker, url, browser) => {
  const [
    [morningstarFairValue] = [],
    morningstarMoat,
    morningstarUncertainty,
    morningstarCapitalAllocation,
    [morningstarDate] = [],
  ] = await fetchPdfData({
    ticker,
    browser,
    analystName: MORNINGSTAR,
    url,
    xPathArr: [
      prevSiblingTextIs("USD", 2),
      followingSiblingTextIs("Price vs. Fair Value ", 4),
      followingSiblingTextIs("Price vs. Fair Value ", 2),
      followingSiblingTextIs("Price vs. Fair Value ", 1),
      prevSiblingTextIs("Capital Allocation", 6),
    ],
    timeout: MORNINGSTAR_TIMEOUT,
  })

  return {
    morningstarFairValue,
    morningstarMoat,
    morningstarUncertainty,
    morningstarCapitalAllocation,
    morningstarDate,
  }
}
