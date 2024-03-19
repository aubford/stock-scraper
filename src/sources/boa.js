const PageDataFetcher = require("../fetchers/PageDataFetcher")
const { handleFetch } = require("./util/www")
const { classContains } = require("./util/xpath")
const { WarnError, ReError } = require("../util")

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @param {object} logger
 * @returns {Promise<{boaIncome:*, morningstarLink:(string|string[]), boaInvestment:*, cfraRating:*, boaRating:*, morningstarRating:*, boaVolatility:*, cfraLink:(string|string[])}>}
 */
const fetchData = async (ticker, browser, logger) => {
  const boaFetcher = new PageDataFetcher(ticker, browser, logger, { timeout: BOA_TIMEOUT })

  await boaFetcher.setPage(
    `https://olui2.fs.ml.com/RIStocksUI/RIStocksOverview.aspx?Symbol=${ticker}&ref=RUN_RIPortfolioStoryUI_PortfolioStory&src=ql`
  )
  const [boaRating, [boaVolatility, boaInvestment, boaIncome] = []] = await boaFetcher
    .fetchPageData([
      `//*[@id="mod_equityRatings"]/div[2]/div[1]/div[1]`,
      `//*[@id="mod_equityRatings"]//span[${classContains(
        "fl ratingBlock ratingBlockActive"
      )}]`,
    ])
    .catch(err => {
      if (err instanceof WarnError) {
        logger.warn("get boa rating failed", err)
        return []
      }
      throw new ReError("get boa rating error", err, "fetchData")
    })

  const morningstarLink = await boaFetcher.fetchHref(
    `//a[contains(@aria-label,"View latest Morningstar")]`
  )
  const cfraLink = await boaFetcher.fetchHref(`//a[contains(@aria-label,"View latest CFRA")]`)
  const [morningstarRating, cfraRating] = await boaFetcher.fetchAttribute(
    `//span[contains(@class,"morningStarRating")]`,
    "aria-label"
  )

  await boaFetcher.close()
  return {
    boaRating,
    boaVolatility,
    boaIncome,
    boaInvestment,
    morningstarRating,
    morningstarLink,
    cfraRating,
    cfraLink,
  }
}

exports.fetch = (ticker, browser) =>
  handleFetch(logger => fetchData(ticker, browser, logger), ticker, "BOA")
