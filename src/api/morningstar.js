const fetchPdfData = require("../fetchPdfData")
const { handleFetch } = require("./util/www")

const getNthHeaderText = n =>
  `(//span[text()="ESG Risk Rating Assessment"])[1]/../following-sibling::span[${n}]/span[normalize-space(text()) != ""]`

/**
 * @param {string} ticker
 * @param {string} url
 * @param {Browser} browser
 * @returns {Promise<{morningstarFairValue:*, morningstarUncertainty:*, morningstarDate:*, morningstarCapitalAllocation:*, morningstarMoat:*}>}
 */
const fetchData = async (ticker, url, browser) => {
  const [
    morningstarFairValue,
    [, morningstarDate] = [],
    morningstarMoat,
    morningstarMoatTrend,
    morningstarUncertainty,
    morningstarCapitalAllocation,
  ] = await fetchPdfData({
    ticker,
    browser,
    analystName: MORNINGSTAR,
    url,
    xPathArr: [
      `(//span[contains(text(), "USD")])[2]`,
      getNthHeaderText(3),
      getNthHeaderText(7),
      getNthHeaderText(8),
      getNthHeaderText(9),
      getNthHeaderText(10),
    ],
    timeout: MORNINGSTAR_TIMEOUT,
  })

  return {
    morningstarFairValue: morningstarFairValue.replace("USD", ""),
    morningstarDate: morningstarDate ? morningstarDate.split(" ").slice(0, 3).join(" ") : "",
    morningstarMoatTrend,
    morningstarMoat,
    morningstarUncertainty,
    morningstarCapitalAllocation,
  }
}

exports.fetch = (ticker, url, browser) =>
  handleFetch(() => fetchData(ticker, url, browser), ticker, MORNINGSTAR)
