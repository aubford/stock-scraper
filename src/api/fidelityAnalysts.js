const PageDataFetcher = require("../PageDataFetcher")
const { makePrettyDate } = require("../util")
const { sortBy } = require("lodash")

const formatFidelityStarmine = (name, rating, date) =>
  `${(name || "").substring(0, 10)} - ${rating} (${date.substring(6, 10)})`

const reportRowXpathFrag = name =>
  `//table[@data-tc="table-analyst-reports"]/tbody/tr[.//a="${name}"]`

/**
 * @param {string} ticker
 * @param  {Browser} browser
 * @returns Promise<Object>
 */
exports.fetch = async (ticker, browser) => {
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
  const morganStanleyOpinion = firmOpinions?.find(({ firmId }) => firmId === 75)
  const zacksOpinion = firmOpinions?.find(({ firmId }) => firmId === 993)

  const res = {
    fidelityAnalystsUpdatedAt: makePrettyDate(),
    fidelityAnalystRatings: sortBy(firmOpinions, "starmineSectorScore")
      .map(({ firmName, currentNormalizedRating, ratingChangeDate }) =>
        formatFidelityStarmine(firmName, currentNormalizedRating, ratingChangeDate)
      )
      .join("\n"),
    fidelitySummaryScore: `${essScore} ${essCurrentRating}`,
    morganStanleyRecommendation: morganStanleyOpinion?.currentNormalizedRating,
    morganStanleyPreviousRecommendation: morganStanleyOpinion?.previousNormalizedRating,
    zacksRecommendation:
      zacksOpinion?.currentNormalizedRating +
      ` (${zacksOpinion?.previousNormalizedRating.toLowerCase()})`,
    argusAnalystDate,
    argusAnalystLink,
    zacksDate,
    zacksLink,
  }

  return res
}
