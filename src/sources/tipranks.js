const { zip, partition, flatten } = require("lodash")
const { makePrettyDate } = require("../util")
const PageDataFetcher = require("../fetchers/PageDataFetcher")
const { handleFetch } = require("./util/www")

const hedgeFundValues = [
  { first: "warren", last: "buffett", value: 6 },
  { first: "bill", last: "gates", value: 5 },
  { first: "daniel", last: "loeb", value: 5 },
  { first: "meridian", last: "", value: 5 },
  { first: "david", last: "tepper", value: 5 },
  { first: "carl", last: "icahn", value: 5 },
  { first: "chuck", last: "akre", value: 5 },
  { first: "prem", last: "watsa", value: 5 },
  { first: "frank", last: "sands", value: 5 },
  { first: "ron", last: "baron", value: 5 },
  { first: "cedar", last: "rock", value: 4 },
  { first: "andy", last: "brown", value: 4 }, // cedar rock
  { first: "andrew", last: "brown", value: 4 }, // cedar rock
  { first: "brad", last: "gerstner", value: 4 },
  { first: "philippe", last: "laffont", value: 4 },
  { first: "david", last: "blood", value: 4 },
  { first: "steve", last: "mandel", value: 4 },
  { first: "eagle", last: "capital", value: 4 }, // eagle capital
  { first: "boykin", last: "curry", value: 4 }, // eagle capital
  { first: "chase", last: "coleman", value: 4 },
  { first: "lee", last: "ainslie", value: 4 },
  { first: "", last: "chilton", value: 4 },
  { first: "george", last: "soros", value: 2 },
  { first: "bill", last: "ackman", value: 5 },
  { first: "fairholme", last: "", value: 4 }, // fairholme
  { first: "bruce", last: "berkowitz", value: 4 }, // fairholme
  { first: "vanguard", last: "health", value: 4 }, // vanguard health
  { first: "edward", last: "owens", value: 4 }, // vanguard health
  { first: "arkk", last: "", value: 0 }, // cathie wood
  { first: "cathie", last: "wood", value: 0 }, // cathie wood
  { first: "catherine", last: "wood", value: 0 }, // cathie wood
  { first: "sequoia", last: "", value: 4 }, // sequoia
  { first: "ruane", last: "cunniff", value: 4 }, // sequoia
  { first: "primecap", last: "", value: 4 },
  { first: "nuveen", last: "", value: 4 },
  { first: "tom", last: "russo", value: 4 },
  { first: "david", last: "rolfe", value: 4 },
  { first: "chuck", last: "royce", value: 4 },
  { first: "harbor", last: "capital", value: 4 }, // harbor capital
  { first: "spiros", last: "segalas", value: 4 }, // harbor capital
  { first: "elfun", last: "", value: 4 },
  { first: "parnassus", last: "endeavor", value: 4 },
  { first: "manning", last: "napier", value: 4 },
  { first: "night", last: "owl", value: 3 }, // night owl
  { first: "john", last: "kim", value: 3 }, // night owl
  { first: "stephen", last: "mandel", value: 3 }, // match
  { first: "christopher", last: "lord", value: 3 },
  { first: "alok", last: "agrawal", value: 3 },
  { first: "william", last: "duhamel", value: 3 },
  { first: "zhang", last: "lei", value: 3 },
  { first: "steven", last: "romick", value: 3 },
  { first: "edgar", last: "wchenheim", value: 3 },
  { first: "pasco", last: "alfaro", value: 3 },
  { first: "ray", last: "dalio", value: 3 },
  { first: "mario", last: "gabelli", value: 3 },
  { first: "robert", last: "rodriguez", value: 3 },
  { first: "can-am", last: "small", value: 3 },
  { first: "bill", last: "nygren", value: 3 },
  { first: "jeff", last: "auxier", value: 3 },
  { first: "ian", last: "cumming", value: 3 },
  { first: "tom", last: "gayner", value: 3 },
  { first: "donald", last: "yacktman", value: 3 },
  { first: "jerome", last: "dodson", value: 3 },
  { first: "hennessy", last: "japan", value: 3 },
  { first: "seth", last: "klarman", value: 3 },
  { first: "arthur", last: "cohen", value: 2 },
  { first: "westport", last: "asset", value: 2 },
  { first: "diamond", last: "hill", value: 2 },
  { first: "ken", last: "heebner", value: 2 }, // more research needed
  { first: "john", last: "paulson", value: 2 },
  { first: "ken", last: "fisher", value: 2 },
  { first: "leith", last: "wheeler", value: 2 },
  { first: "murray", last: "stahl", value: 2 },
  { first: "ted", last: "kang", value: 2 },
  { first: "james", last: "barrow", value: 2 },
  { first: "", last: "eveillard", value: 3 },
  { first: "bill", last: "frels", value: 2 },
  { first: "richard", last: "snow", value: 2 },
  { first: "chris", last: "davis", value: 2 },
  { first: "wallace", last: "weitz", value: 2 },
  { first: "brian", last: "rogers", value: 2 },
  { first: "ronald", last: "muhlenkamp", value: 2 },
  { first: "john", last: "keeley", value: 2 },
  { first: "arnold", last: "schneider", value: 2 },
  { first: "dodge", last: "cox", value: 2 },
  { first: "robert", last: "olstein", value: 2 },
  { first: "john", last: "buckingham", value: 2 },
  { first: "robert", last: "bruce", value: 2 },
  { first: "john", last: "rogers", value: 2 },
  { first: "joel", last: "greenblatt", value: 1 },
  { first: "tweedy", last: "browne", value: 1 },
  { first: "martin", last: "whitman", value: 1 },
  { first: "mason", last: "hawkins", value: 1 },
  { first: "john", last: "hussman", value: 1 },
  { first: "jeremy", last: "grantham", value: 1 },
  { first: "charles", last: "brandes", value: 1 },
  { first: "francis", last: "chou", value: 1 },
  { first: "louis", last: "bacon", value: 1 },
]

const isBadHedgeData = (holdingChange, action) => {
  const actionType =
    parseFloat(holdingChange) === 0 ? "eq" : holdingChange.includes("-") ? "desc" : "inc"

  const actionMap = {
    inc: ["added", "new"],
    desc: ["reduced", "sold out"],
    eq: ["no change"],
  }

  const wrongActions = Object.keys(actionMap)
    .filter(type => type !== actionType)
    .reduce((acc, key) => acc.concat(actionMap[key]), [])

  return wrongActions.includes(action.toLowerCase())
}

const getMovementValue = (movement, hedgeCoeff) => {
  const isPrimo = hedgeCoeff > 3

  const buyThreshold = 1,
    holdThreshold = -0.5,
    trimThreshold = -2,
    sellThreshold = -8,
    sellOutThreshold = -80,
    buyVal = 1.25,
    holdVal = isPrimo ? 0.5 : 0,
    rebalanceVal = 0,
    trimVal = -0.5,
    sellVal = -1,
    sellOutVal = -1.25

  const getNegativeVal = x =>
    x < sellOutThreshold
      ? sellOutVal
      : x < sellThreshold
      ? sellVal
      : x < trimThreshold
      ? trimVal
      : rebalanceVal
  const getPositiveVal = x => (x > buyThreshold ? buyVal : holdVal)

  return movement > holdThreshold ? getPositiveVal(movement) : getNegativeVal(movement)
}
const getHedgeRating = tipHedgeMoves =>
  tipHedgeMoves.reduce((sum, hedgeFundStr) => {
    if (hedgeFundStr === "ERROR") {
      return sum
    }

    const mapData = hedgeFundValues.find(({ first, last }) => {
      const lowerName = hedgeFundStr.toLowerCase()
      return lowerName.includes(first) && lowerName.includes(last)
    })
    const hedgeCoeff = mapData ? mapData.value : 1

    const movementMatches = hedgeFundStr.match(/(?<=,\[.+)[-\d.],?[-\d.]+/g)
    const movementNumberWithoutCommas = Number(movementMatches[0].replace(",", ""))

    return sum + getMovementValue(movementNumberWithoutCommas, hedgeCoeff) * hedgeCoeff
  }, 0)

/**
 * @param ticker
 * @param {Browser} browser
 * @param {object} logger
 * @returns {Promise<Object>}
 */
const fetchData = async (ticker, browser, logger) => {
  const fetcher = new PageDataFetcher(ticker, browser, logger, {
    timeout: TIPRANKS_TIMEOUT,
  })

  await fetcher.setPageTrPopup()

  const [
    tipScore = "",
    [
      tipAnalystRatings = "",
      tipInsiderActivity = "",
      tipHedgeActivity = "",
      tipNewSent = "",
      tipBloggers = "",
      tipInvestors = "",
      tipTechnicals = "",
      tipMomentum = "",
      tipROE = "",
      tipAssetGrowth = "",
    ] = [],
    tipTargetStr,
  ] = await fetcher.fetchPageData([
    `//span[@class="single-bar-internal-score selected"]`,
    `//div[@class="tipranks-smart-score-factors-container"]//div[contains(@class,"sub-factor-single-value")]`,
    `//span[@class="sub-factor-single-info"][contains(text(),"Average price target")]`,
  ])

  // ANALYSTS
  await fetcher.click(
    `div.tipranks-top-row > .tipranks-widget section[aria-label="Analyst Ratings"] > div > span > button`
  )
  await fetcher.waitForXpath(`//table[@id="tipranks-analyst-ratings"]/tbody/tr`)
  await fetcher.clickWhile(`button[data-test-id="tipranksanalystratings_showmore"]`)
  const analystStrings = await fetcher.fetchPageData([
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr/th/div[@class="analyst-cell"]/div[2]/span`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="converted-target-price"]`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="stock-rating"]`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="analyst-action"]`,
    `//table[@id="tipranks-analyst-ratings"]/tbody/tr//*[@data-test-id="latest-report"]`,
  ])

  const tipAnalystsZip = zip(...analystStrings)

  const morganStanley = tipAnalystsZip.find(analyst => analyst[0].includes("Morgan Stanley"))
  const tipMorganStanleyRating = morganStanley
    ? `${morganStanley.slice(1, 3).join(", ")}\n${morganStanley.slice(3, 5).join(", ")}`
    : ""
  const tipJefferiesRating = tipAnalystsZip
    .find(analyst => analyst[0].includes("Jefferies"))
    ?.slice(1)
    .join(" ,")
  const [maintained, changed] = partition(tipAnalystsZip, analyst =>
    ["initiated", "reiterated", "maintained"].includes(analyst[3]?.toLowerCase().trim())
  )
  const tipAnalysts = [...changed, "", ...maintained].join("\n")

  // INVESTORS
  await fetcher.click(
    `div.tipranks-top-row > .tipranks-widget section[aria-label="Investor Sentiment"] > div > span > button`
  )
  const [[tipYoungHolders, tipMidageHolders, tipOldHolders] = []] =
    await fetcher.fetchPageData([`//p[@class="age-group-box-bigNum holders"]`])

  // BLOGGERS
  const shouldGetBloggers = tipBloggers !== "N/A"
  if (shouldGetBloggers) {
    await fetcher.click(
      `div.tipranks-top-row > .tipranks-widget section[aria-label="Blogger Opinions"] > div > span > button`
    )
  }
  const [tipBlogArticleDates] = shouldGetBloggers
    ? await fetcher.fetchPageData([
        `//table[@id="tipranks-blogger-table"]/tbody/tr/td/span[@data-test-id="date-cell"]`,
      ])
    : []
  const tipBlogArticles = shouldGetBloggers
    ? await fetcher.fetchHref(`//table[@id="tipranks-blogger-table"]/tbody/tr/td/a`)
    : []

  // HEDGE FUNDS
  const shouldGetHedgeActivity = tipHedgeActivity !== "N/A"
  if (shouldGetHedgeActivity) {
    await fetcher.click(
      `div.tipranks-top-row > .tipranks-widget section[aria-label="Hedge Fund Activity"] > div > span > button`
    )
    await fetcher.waitForXpath(`//table[@id="tipranks-hedge-fund-activity"]/tbody/tr`)
    await fetcher.clickWhile(`button[data-test-id="hedgefundactivity_showmore"]`)
  }
  const [tipHedgeStrings] = shouldGetHedgeActivity
    ? await fetcher.fetchPageData([`//table[@id="tipranks-hedge-fund-activity"]/tbody/tr`])
    : []

  const tipHedgeMoves =
    shouldGetHedgeActivity && tipHedgeStrings
      ? [].concat(tipHedgeStrings).map(str => {
          const trimmed = str.replace("hedgeFundManagerName", "")
          const splitName = trimmed.split("action")
          const splitAction = splitName[1].split("holdingChange")
          const splitHoldingChange = splitAction[1].split("valueReported")
          const splitPctPortfolio = splitHoldingChange[1].split("percentageOfPortfolio")

          if (isBadHedgeData(splitHoldingChange[0], splitAction[0])) {
            return "ERROR"
          }

          return `${splitName[0].slice(0, 20)},[${splitAction[0].toUpperCase()},${
            splitHoldingChange[0]
          },${splitPctPortfolio[1]}]`
        })
      : []

  const tipHedgeRating =
    shouldGetHedgeActivity && tipHedgeMoves ? getHedgeRating(tipHedgeMoves) : ""

  // INSIDERS
  const shouldGetInsiders = tipInsiderActivity !== "N/A"
  if (shouldGetInsiders) {
    await fetcher.click(
      `div.tipranks-top-row > .tipranks-widget section[aria-label="Corporate Insider Activity"] > div > span > button`
    )
    await fetcher.waitForXpath(
      `//table[@id="tipranks-insider-activity"]/tbody/tr/td/div[@data-test-id="insiders-action"]`
    )
    await fetcher.clickWhile(`button[data-test-id="insideractivity_showmore"]`)
  }
  const [tipInsiderActions, tipInsiderActionDates] = shouldGetInsiders
    ? await fetcher.fetchPageData([
        `//table[@id="tipranks-insider-activity"]/tbody/tr/td/div[@data-test-id="insiders-action"]`,
        `//table[@id="tipranks-insider-activity"]/tbody/tr/td/span[@data-test-id="date-cell"]`,
      ])
    : []

  const tipInsiderEvents =
    shouldGetInsiders && tipInsiderActions && tipInsiderActionDates
      ? zip(tipInsiderActionDates, tipInsiderActions)
          .filter(([, action]) => !action.includes("Uninformative"))
          .map(event => event.join(" -> "))
          .join("\n")
      : ""

  await fetcher.close()

  return {
    tipUpdatedAt: makePrettyDate(),
    tipAnalysts,
    tipMorganStanleyRating,
    tipJefferiesRating,
    tipInsiderEvents,
    tipScore,
    tipAnalystRatings,
    tipInsiderActivity,
    tipHedgeActivity,
    tipNewSent,
    tipBloggers,
    tipInvestors,
    tipTechnicals,
    tipMomentum,
    tipROE,
    tipAssetGrowth,
    tipYoungHolders,
    tipMidageHolders,
    tipOldHolders,
    tipTarget: tipTargetStr ? tipTargetStr.split("$")[1] : "",
    tipBlogArticles:
      tipBlogArticles && tipBlogArticleDates
        ? flatten(zip(tipBlogArticleDates, tipBlogArticles))
        : [],
    tipHedgeMoves: tipHedgeMoves.join("\n"),
    tipHedgeRating,
  }
}

exports.fetch = (ticker, browser) => ({})
  // handleFetch(logger => fetchData(ticker, browser, logger), ticker, TIPRANKS)
