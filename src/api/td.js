const { containsClass } = require("./util")
const PageDataFetcher = require("../PageDataFetcher")
const Logger = require("../Logger")
const { formatErrorObject } = require("../util")

const fetchTd = async (ticker, browser) => {
  const pageFetcher = new PageDataFetcher(TD, ticker, browser, { timeout: TD_TIMEOUT })
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
exports.fetch = (ticker, browser) => {
  const logger = new Logger(ticker, "TD.fetch", true)
  return fetchTd(ticker, browser).catch(error => {
    logger.error("fetch error! ", error)
    return formatErrorObject(error)
  })
}
