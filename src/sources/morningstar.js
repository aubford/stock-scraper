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
      // Morningstar's pdf.js renderer puts each label / value / date in a separate
      // <span class="markedContent">. Grab the two markedContent siblings right after
      // the "Fair Value Estimate" label to get [value, date].
      `(//div[@class='page'][@data-page-number='1']//span[contains(text(), 'Fair Value Estimate')]/ancestor::span[@class='markedContent'][1]/following-sibling::span[@class='markedContent'])[position() <= 2]`,
      `(//div[@class='page'][@data-page-number='1']//span[contains(text(), 'Uncertainty')])[1]/ancestor::span[@class='markedContent'][1]/following-sibling::span[@class='markedContent'][1]`,
      `(//div[@class='page'][@data-page-number='1']//span[contains(text(), 'Capital Allocation')])[1]/ancestor::span[@class='markedContent'][1]/following-sibling::span[@class='markedContent'][1]`,
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
