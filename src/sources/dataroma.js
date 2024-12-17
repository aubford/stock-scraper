const JsDomFetcher = require("../fetchers/JsDomFetcher")
const { handleFetch } = require("./util/www")
const { extractNumbers } = require("./util/str")
const { tail } = require("lodash")
const { orderBy } = require("lodash/collection")

const getMovementNumber = activity => {
  const movementNum = Number(extractNumbers(activity))
  return activity.includes("Reduce")
    ? movementNum * -1
    : activity === "Buy"
    ? 100
    : movementNum
}

// sellout(-2.25) -40 sell(-1.5) -8 trim(-1) -3 rebalance(-.5) 0 hold(.75) 3 buy(2) 20 bigbuy(3) 100
const getMovementValue = movement => {
  const bigBuyThreshold = 20,
    buyThreshold = 3,
    holdThreshold = 0,
    trimThreshold = -3,
    sellThreshold = -8,
    sellOutThreshold = -40,
    bigBuyVal = 3,
    buyVal = 2,
    holdVal = 0.75,
    rebalanceVal = -0.5,
    trimVal = -1,
    sellVal = -1.5,
    sellOutVal = -2.25

  if (movement === "") {
    return buyThreshold
  }

  const getNegativeVal = x =>
    x < sellOutThreshold
      ? sellOutVal
      : x < sellThreshold
      ? sellVal
      : x < trimThreshold
      ? trimVal
      : rebalanceVal
  const getPositiveVal = x =>
    x > bigBuyThreshold ? bigBuyVal : x > buyThreshold ? buyVal : holdVal

  return movement >= holdThreshold ? getPositiveVal(movement) : getNegativeVal(movement)
}

/**
 * @param ticker
 * @param fetcher
 * @returns {Promise<{firm: *, activity, pctOfPortfolio: *, value: string}[]>}
 */
const getOwnership = async (ticker, fetcher) => {
  await fetcher.setPage(`https://dataroma.com/m/stock.php?sym=${ticker}`)
  const ownershipRows = await fetcher.$$x(`//table[@id='grid']/tbody/tr`)
  return ownershipRows.map(row => {
    const [, firm, pctOfPortfolio, activity, , valueString] = row.getTextArrByX(`td`)
    const value = valueString.replaceAll(",", "")
    return {
      firm,
      pctOfPortfolio,
      activity: activity?.trim() || "0",
      value: (value / 1000000).toFixed(2) + "M",
    }
  })
}

/**
 * @param ticker
 * @param fetcher
 * @returns {Promise<{firm: *, activity: string, pctOfPortfolio: string, value: string}[]>}
 */
const getSells = async (ticker, fetcher) => {
  await fetcher.setPage(`https://dataroma.com/m/activity.php?sym=${ticker}&typ=a`)
  const activityRows = await fetcher.$$x(`//table[@id='grid']/tbody/tr`)
  const nextQuarterIndex = tail(activityRows).findIndex(({ textContent }) => {
    return textContent.includes("Q") && textContent.replace(" ", "").length === 7
  })
  const thisQuarterActivity = activityRows.slice(1, nextQuarterIndex + 1)
  const sellRows = thisQuarterActivity.filter(row => row.textContent.includes("Sell"))
  const sellFirmNames = sellRows.map(sell => sell.textContent.split("\n")[2])
  return sellFirmNames.map(firm => ({
    firm,
    activity: "Reduce 100%",
    value: "0",
    pctOfPortfolio: "0",
  }))
}

/**
 * @param logger
 * @param ticker
 * @returns {Promise<{dataromaActions: string, dataromaRating: *}>}
 */
const fetchData = async (logger, ticker) => {
  const fetcher = new JsDomFetcher()

  const ownershipData = await getOwnership(ticker, fetcher).catch(err => {
    if (err.code === 489) {
      return []
    }
    throw err
  })
  const sells = await getSells(ticker, fetcher).catch(err => {
    if (err.code === 489) {
      return []
    }
    throw err
  })

  const dataromaActions = orderBy(
    ownershipData,
    ({ activity }) => getMovementNumber(activity),
    "desc"
  )
    .concat(sells)
    .map(({ firm, pctOfPortfolio, activity, value }) => {
      return `${firm}\n [${activity}, ${pctOfPortfolio}] ${value}`
    })
    .join("\n")

  const dataromaRating = ownershipData.concat(sells).reduce((sum, { activity }) => {
    const movement = getMovementNumber(activity)
    const value = getMovementValue(movement)
    return sum + value
  }, 0)

  return { dataromaRating, dataromaActions }
}

exports.fetch = ticker => handleFetch(fetchData, ticker, "Dataroma")
