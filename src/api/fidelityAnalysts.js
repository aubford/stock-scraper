const PageDataFetcher = require("../PageDataFetcher")
const { makePrettyDate } = require("../util")
const { sortBy } = require("lodash")
const Logger = require("../Logger")

const formatFidelityStarmine = starmineOpinion => {
  if (!starmineOpinion) return ""

  const { currentNormalizedRating, ratingChangeDate, previousNormalizedRating } =
    starmineOpinion

  return `${currentNormalizedRating} (${ratingChangeDate?.substring(6, 10)}${
    previousNormalizedRating ? ", " + previousNormalizedRating : ""
  })`
}

const reportRowXpathFrag = name =>
  `//table[@data-tc="table-analyst-reports"]/tbody/tr[.//a="${name}"]`

/**
 * @param {string} ticker
 * @param  {Browser} browser
 * @returns Promise<Object>
 */
const fetchFidelityAnalysts = async (ticker, browser) => {
  const fetcher = new PageDataFetcher(FIDELITY, ticker, browser, {
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

  const [zacksDate, zacksLink, argusAnalystDate, argusAnalystLink] =
    await fetcher.fetchPageData([
      reportRowXpathFrag("Zacks Investment Research") + `/td[1]/time`,
      reportRowXpathFrag("Zacks Investment Research") + `/td[2]/a/@href`,
      reportRowXpathFrag("Argus Analyst") + `/td[1]/time`,
      reportRowXpathFrag("Argus Analyst") + `/td[2]/a/@href`,
    ])

  await fetcher.close()

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
      .join("\n"),
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

/**
 * @param {string} ticker
 * @returns {Promise<Object>}
 */
exports.fetch = (ticker, browser) => {
  const logger = new Logger(ticker, "Fidelity fetch")
  return fetchFidelityAnalysts(ticker, browser).catch(error => {
    logger.error(error)
    return {}
  })
}
