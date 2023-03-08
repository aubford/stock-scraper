const { containsClass } = require("./util")
const PageDataFetcher = require("../PageDataFetcher")
const { handleFetch } = require("./util/www")

const fetchData = async (ticker, browser, logger) => {
  const pageFetcher = new PageDataFetcher(ticker, browser, logger, { timeout: TD_TIMEOUT })
  await pageFetcher.setPage(
    `https://invest.ameritrade.com/grid/p/site#r=jPage/https://research.ameritrade.com/grid/wwws/research/stocks/earnings?symbol=${ticker}&c_name=invest_VENDOR`
  )

  const [tdLastEarningsDate, tdNextEarningsDate] = await pageFetcher.fetchPageDataInFrame(
    [
      `//*[${containsClass("earnings-data")}]//td[1]/text()[2]`,
      `//td[${containsClass("value week-of")}]`,
    ],
    "main"
  )

  await pageFetcher.close()

  return {
    tdNextEarningsDate: tdNextEarningsDate?.replace("(Unconfirmed)", ""),
    tdLastEarningsDate: tdLastEarningsDate?.replace("Announced ", ""),
  }
}

/**
 * @param {string} ticker
 * @returns {Promise<Object>}
 */
exports.fetch = (ticker, browser) =>
  handleFetch(logger => fetchData(ticker, browser, logger), ticker, TD)
