const fetchPdfData = require("../fetchPdfData")
const { makePrettyDate } = require("../util")
const { selfTextContains } = require("./util")
const { last } = require("lodash")
const Logger = require("../Logger")
const { handleFetch } = require("./util/www")

/**
 * @param {string} ticker
 * @param {Browser} browser
 * @returns {Promise<{}|{ncRoic:*, ncPB:*, ncRating:*, ncFCF:*, ncGap:*, ncEps:*}>}
 */
const fetchData = async (ticker, browser) => {
  const [ncPeriodEndDateStr, [ncRating, ncRoic, ncFCF, ncEps, ncGap, ncPB] = [], isSuspended] =
    await fetchPdfData({
      ticker,
      browser,
      analystName: NEW_CONSTRUCTS,
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        selfTextContains("for period ending"),
        `//span[text()="1 - Very Attractive" or text()="2 - Attractive" or text()="3 - Neutral"  or text()="4 - Unattractive" or text()="5 - Very Unattractive"]`,
        selfTextContains("Suspended"),
      ],
      waitForPostScroll: `//span[contains(text(),"Price-to-EBV Ratio is")]`,
      timeout: NEW_CONSTRUCTS_TIMEOUT,
    })

  const periodEndDate = ncPeriodEndDateStr ? last(ncPeriodEndDateStr.split(" ")) : ""

  return {
    ncUpdatedAt: makePrettyDate(),
    ncRatingB: "DEPRECATED",
    ncEps,
    ncFCF,
    ncGap,
    ncPB,
    ncRoic,
    ncRating,
    ncPeriodEndDate: isSuspended ? "***SUSPENDED***" : periodEndDate,
  }
}

exports.fetch = (ticker, browser) =>
  handleFetch(() => fetchData(ticker, browser), ticker, "newConstructs.fetch")
