const _ = require("lodash")
/**
 * @typedef {Page} MyPage
 * @property getTextByX
 */

/**
 * @param page {Page}
 * @param selector {string}
 * @returns {Promise<string>}
 */
const getTextByX = async (page, selector) => {
  /**
   * @type {ElementHandle[]}
   */
  const elementArr = await page.$x(selector)
  if (!elementArr.length) {
    return "N/A"
  }
  if (elementArr.length === 1) {
    return await elementArr[0].evaluate(node => node.textContent)
  }
  return await Promise.all(elementArr.map(element => element.evaluate(node => node.textContent)))
}

/** @returns {Promise<MyPage>} */
const newBrowserPage = async (browser, url) => {
  /** @type {MyPage} */
  const page = await browser.newPage()

  await page.goto(url)

  page.getTextByX = text => getTextByX(page, text)
  return page
}

const parseStreetBulletData = (lineOne, lineTwo) => {
  const firstBulletIndicators = [
    { indicator: "Premium", value: [2, 1] },
    { indicator: "Discount", value: [4, 5] },
    { indicator: "Average", value: [3, 3] },
    { indicator: "Higher", value: [4, 5] },
    { indicator: "Lower", value: [2, 1] }
  ]
  const fullTextBullets = _.zipWith(lineOne, lineTwo, (a, b) => `${a} ${b}`)
  const chunked = _.chunk(fullTextBullets, 2)
  const mapped = chunked.map(([bulletA, bulletB]) => {
    if (bulletA.includes("Neutral")) {
      return ""
    }
    return firstBulletIndicators.find(({ indicator }) => bulletA.includes(indicator)).value[
      bulletB.includes("significant") ? 1 : 0
    ]
  })

  return _.fromPairs(
    _.zip(
      [
        "streetPE",
        "streetPCF",
        "streetProjEarn",
        "streetPEG",
        "streetPB",
        "streetEarningsGrowth",
        "streetPSales",
        "streetSalesGrowth"
      ],
      mapped
    )
  )
}


module.exports = {
  newBrowserPage,
  parseStreetBulletData
}
