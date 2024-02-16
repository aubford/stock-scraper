const JsDomFetcher = require("../fetchers/JsDomFetcher")
const { handleFetch } = require("./util/www")
const Logger = require("../Logger")
const { extractNumbers } = require("./util/str")
const { tail } = require("lodash")

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

const fetchData = async (logger, ticker) => {
  const fetcher = new JsDomFetcher("Dataroma", ticker)

  await fetcher.setPage(`https://dataroma.com/m/stock.php?sym=${ticker}`)
  const ownershipRows = await fetcher.$$x(`//table[@id='grid']/tbody/tr`)
  const ownershipData = ownershipRows.map(row => {
    const [, firm, pctOfPortfolio, activity, , value] = row.getTextArrByX(`td`)
    return {
      firm,
      pctOfPortfolio,
      activity: activity?.trim() || "0",
      value,
    }
  })

  const dataromaActions = ownershipData
    .map(({ firm, pctOfPortfolio, activity, value }) => {
      return `${firm}\n [${activity}, ${pctOfPortfolio}] $${value}`
    })
    .join("\n")

  const sells = await getSells(ticker, fetcher)

  const dataromaRating = ownershipData
    .concat(sells)
    .reduce((sum, { activity }) => {
      const movementNum = Number(extractNumbers(activity))
      const movement = activity.includes("Reduce")
        ? movementNum * -1
        : activity === "Buy"
        ? 100
        : movementNum
      const value = getMovementValue(movement)
      return sum + value
    }, 0)

  return { dataromaRating, dataromaActions }
}

exports.fetch = ticker => handleFetch(fetchData, ticker, "Dataroma")
