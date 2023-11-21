const PageDataFetcher = require("../PageDataFetcher")
const { makePrettyDate } = require("../util")
const { sortBy } = require("lodash")
const { handleFetch } = require("./util/www")

const formatFidelityStarmine = starmineOpinion => {
  if (!starmineOpinion) return ""

  const {
    currentNormalizedRating,
    ratingChangeDate,
    previousNormalizedRating,
  } = starmineOpinion

  return `${currentNormalizedRating}\n${ratingChangeDate?.substring(
    6,
    10
  )}\n(${previousNormalizedRating})\n`
}

const reportRowXpathFrag = name => `//table[@data-tc="table-firm-opinions"][.//td="${name}"]`

/**
 * @param {string} ticker
 * @param  {Browser} browser
 * @param {object} logger
 * @returns Promise<Object>
 */
const fetchData = async (ticker, browser, logger) => {
  const fetcher = new PageDataFetcher(ticker, browser, logger, {
    timeout: FIDELITY_ANALYST_TIMEOUT,
  })

  let essRes = {}
  fetcher.addResponseInterceptorFuzzy(
    [
      "https://api.markitdigital.com/fidelity-equities-investarstarmine-analystsummaryscore/v1/analystSummaryScore",
    ],
    res => {
      essRes = res.data
    }
  )

  await fetcher.setPage(
    `https://digital.fidelity.com/prgw/digital/research/quote/dashboard/ratings-sentiment?symbols=${ticker}`
  )

  const [zacksDate, zacksLink] = await fetcher.fetchPageData([
    reportRowXpathFrag("Zacks Investment Research, Inc") + `//time`,
    reportRowXpathFrag("Zacks Investment Research, Inc") + `//a/@href`,
  ])

  await fetcher.clickForXpath(`//button[@data-tc="other"]`)

  const [argusAnalystDate, argusAnalystLink] = await fetcher.fetchPageData([
    reportRowXpathFrag("Argus Analyst") + `//time`,
    reportRowXpathFrag("Argus Analyst") + `//a/@href`,
  ])

  await fetcher.close()

  // todo: giving the wrong date for zacksRecommendation
  const { essCurrentRating, essScore, firmOpinions } = essRes

  const zacksOpinion = firmOpinions?.find(({ firmId }) => firmId === 993)
  const morganStanleyOpinion = firmOpinions?.find(({ firmId }) => firmId === 75)
  const fordOpinion = firmOpinions?.find(({ firmId }) => firmId === 696)
  const jefferiesOpinion = firmOpinions?.find(({ firmId }) => firmId === 36)

  const res = {
    fidelityAnalystsUpdatedAt: makePrettyDate(),
    fidelityAnalystRatings: sortBy(firmOpinions, "starmineSectorScore")
      .map(
        analystOpinion =>
          (analystOpinion.firmName || "").substring(0, 10) +
          " - " +
          formatFidelityStarmine(analystOpinion)
      )
      .join(""),
    fidelitySummaryScore: `${essScore} ${essCurrentRating}`,
    fidelityMorganStanleyRecommendation: formatFidelityStarmine(morganStanleyOpinion),
    zacksRecommendation: formatFidelityStarmine(zacksOpinion),
    fordRecommendation: formatFidelityStarmine(fordOpinion),
    jefferiesRecommendation: formatFidelityStarmine(jefferiesOpinion),
    argusAnalystDate,
    argusAnalystLink,
    zacksDate,
    zacksLink,
  }

  return res
}

exports.fetch = (ticker, browser) =>
  handleFetch(logger => fetchData(ticker, browser, logger), ticker, FIDELITY)
