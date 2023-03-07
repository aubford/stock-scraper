const { followingSiblingTextIs, prevSiblingTextIs } = require("./util")
const { zipWith, chunk, fromPairs, zip } = require("lodash")
const fetchPdfData = require("../fetchPdfData")
const { handleFetch } = require("./util/www")

const parseStreetBulletData = (lineOne, lineTwo) => {
  const firstBulletIndicators = [
    { indicator: "Premium", value: [2, 1] },
    { indicator: "Discount", value: [4, 5] },
    { indicator: "Average", value: [3, 3] },
    { indicator: "Higher", value: [4, 5] },
    { indicator: "Lower", value: [2, 1] },
  ]
  const fullTextBullets = zipWith(lineOne, lineTwo, (a, b) => `${a} ${b}`)
  const chunked = chunk(fullTextBullets, 2)
  const mapped = chunked.map(([bulletA, bulletB]) => {
    if (bulletA.includes("Neutral")) {
      return ""
    }
    return firstBulletIndicators.find(({ indicator }) => bulletA.includes(indicator)).value[
      bulletB.includes("significant") ? 1 : 0
    ]
  })

  return fromPairs(
    zip(
      [
        "streetPE",
        "streetPCF",
        "streetProjEarn",
        "streetPEG",
        "streetPB",
        "streetEarningsGrowth",
        "streetPSales",
        "streetSalesGrowth",
      ],
      mapped
    )
  )
}

const fetchData = async (ticker, browser) => {
  const [
    streetRating,
    streetGrowth,
    streetTotalReturn,
    streetEfficiency,
    streetVolatility,
    streetSolvency,
    streetIncome,
    streetBulletDataLineOne,
    streetBulletDataLineTwo,
    streetTargetPrice,
  ] = await fetchPdfData({
    ticker,
    browser,
    analystName: THE_STREET,
    url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=20034&documenttag=${ticker}&c_name=invest_VENDOR`,
    xPathArr: [
      followingSiblingTextIs("RATING SINCE", 2), // 0 growth
      prevSiblingTextIs("Growth", 2), // 0 growth
      prevSiblingTextIs("Total Return", 2), // 1 total return
      prevSiblingTextIs("Efficiency", 2), // 2 efficiency
      prevSiblingTextIs("Price volatility", 2), // 3 price volatility
      prevSiblingTextIs("Solvency", 2), // 4 solvency
      prevSiblingTextIs("Income", 2), // 5 income
      `//span[contains(text(),'• ')]`, // 6 ...bullentPointData (lineOne)
      `//span[contains(text(),'• ')]/following-sibling::span[1]`, // 7 ...bulletPointData (lineTwo)
      `//span[text()='TARGET PRICE ']/following-sibling::span[1]`, // 8 target price
    ],
    //screenShotArr: [{ x: 344, y: 138, width: 468, height: 48 }],
    waitForPostScroll: "//span[contains(text(),'• ')]",
  })

  return {
    streetEfficiency,
    streetGrowth,
    streetIncome,
    streetRating,
    streetSolvency,
    streetTargetPrice,
    streetTotalReturn,
    streetVolatility,
    ...parseStreetBulletData(streetBulletDataLineOne, streetBulletDataLineTwo),
  }
}

exports.fetch = (ticker, browser) =>
  handleFetch(() => fetchData(ticker, browser), ticker, "Street.fetch")
