const PageDataFetcher = require("../PageDataFetcher")
const Logger = require("../Logger")
const { formatErrorObject } = require("../util")

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<{boaIncome:*, morningstarLink:(string|string[]), boaInvestment:*, cfraRating:*, boaRating:*, morningstarRating:*, boaVolatility:*, cfraLink:(string|string[])}>}
 */
const fetchBoa = async (ticker, browser) => {
  const boaFetcher = new PageDataFetcher(BOA, ticker, browser, { timeout: BOA_TIMEOUT })

  await boaFetcher.setPage(
    `https://olui2.fs.ml.com/RIStocksUI/RIStocksOverview.aspx?Symbol=${ticker}&ref=RUN_RIPortfolioStoryUI_PortfolioStory&src=ql`
  )
  const [boaRating, [boaVolatility, boaInvestment, boaIncome] = []] =
    await boaFetcher.fetchPageData([
      `//*[@id="mod_equityRatings"]/div[2]/div[1]/div[1]`,
      `//*[@id="mod_equityRatings"]//span[@class="fl ratingBlock ratingBlockActive"]`,
    ])

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

exports.fetch = (ticker, browser) => {
  const logger = new Logger(ticker, "BoA.fetch", true)
  return fetchBoa(ticker, browser).catch(error => {
    logger.error("fetch error!", error)
    return formatErrorObject(error)
  })
}
