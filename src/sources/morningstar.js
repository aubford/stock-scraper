const fetchPdfData = require("../fetchers/fetchPdfData")
const { handleFetch } = require("./util/www")

/**
 * @param {string} ticker
 * @param {string} url
 * @param {Browser} browser
 * @returns {Promise<{morningstarFairValue:*, morningstarUncertainty:*, morningstarDate:*, morningstarCapitalAllocation:*, morningstarMoat:*}>}
 */
const fetchData = async (ticker, url, browser) => {
  if (!url) {
    return {}
  }

  const [
    [morningstarFairValue, morningstarDate],
    morningstarUncertainty,
    morningstarCapitalAllocation,
    morningstarMoat,
  ] = await fetchPdfData({
    ticker,
    browser,
    analystName: "MORNINGSTAR",
    url,
    xPathArr: [
      `(//span[normalize-space(.)='Fair Value Estimate']/ancestor::span[@class='markedContent'][1]/following-sibling::span[@class='markedContent'][1]//span[normalize-space()][1])[1]`,
      `(//span[contains(text(), "Uncertainty")])[1]/following-sibling::span[1]`,
      `(//span[contains(text(), "Capital Allocation")])[1]/following-sibling::span[1]`,
      `(//span[contains(text(), "Economic Moat")])[1]/../following-sibling::span[3]/span`,
    ],
    timeout: MORNINGSTAR_TIMEOUT,
  })

  return {
    morningstarFairValue: morningstarFairValue.replace(" USD", ""),
    morningstarDate: morningstarDate ? morningstarDate.split(" ").slice(0, 3).join(" ") : "",
    morningstarMoat,
    morningstarUncertainty,
    morningstarCapitalAllocation,
  }
}

exports.fetch = (ticker, url, browser) =>
  handleFetch(() => fetchData(ticker, url, browser), ticker, "MORNINGSTAR")
