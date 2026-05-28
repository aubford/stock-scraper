const PageDataFetcher = require("../fetchers/PageDataFetcher")
const { makePrettyDate, formatMsDate, WarnError, ReError } = require("../util")
const { sortBy, partition, isArray, isString } = require("lodash")
const { handleFetch } = require("./util/www")
const { pause } = require("../util")

const formatFidelityStarmine = (starmineOpinion, { includeDate = true } = {}) => {
  if (!starmineOpinion) return ""

  const { currentNormalizedRating, ratingChangeDate, previousNormalizedRating } =
    starmineOpinion

  const datePart = includeDate ? ` ${ratingChangeDate}` : ""
  return `${currentNormalizedRating} (${previousNormalizedRating})${datePart}`
}

const formatRatings = firmOpinions => {
  const sortedFirmOpinions = sortBy(firmOpinions, "starmineSectorScore")

  return sortedFirmOpinions
    .map(
      analystOpinion =>
        (analystOpinion.firmName || "").substring(0, 8) +
        " " +
        formatFidelityStarmine(analystOpinion),
    )
    .join("\n")
}

const VISIBLE_PANEL = `//div[contains(@class,'pvd-tab-panel--visible')]`

const reportRowXpathFrag = name => `${VISIBLE_PANEL}//table//tr[.//a[contains(., "${name}")]]`

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

  const analystInterceptor = fetcher.addResponseInterceptor([
    "digital/research/api/opinion-detail",
  ])

  await fetcher.setPage(
    `https://digital.fidelity.com/prgw/digital/research/quote/dashboard/ratings-sentiment?symbol=${ticker}`,
    { waitUntil: "load" },
  )

  const [zacksDate, zacksLink] = await fetcher
    .fetchPageData([
      reportRowXpathFrag("Zacks Investment Research") + `//td[last()]//span`,
      reportRowXpathFrag("Zacks Investment Research") + `//a/@href`,
    ])
    .catch(err => {
      if (err instanceof WarnError) {
        logger.warn("get Zacks link/date failed", err)
        return []
      }
      throw new ReError("get Zacks link/date err", err, "fetchData")
    })

  fetcher.setTimeout(4)
  const [argusAnalystDate, argusAnalystLink] = await fetcher
    .fetchPageData([
      reportRowXpathFrag("Argus Analyst") + `//td[last()]//span`,
      reportRowXpathFrag("Argus Analyst") + `//a/@href`,
    ])
    .catch(err => {
      if (err instanceof WarnError) {
        logger.warn("get Argus link/date failed", err)
        return []
      }
      throw new ReError("get Argus link/date err", err, "fetchData")
    })

  // Wait a bit for the response to be fully processed
  await pause(1000)

  const essRes = await analystInterceptor.waitForResult().catch(err => {
    logger.warnError(err)
  })

  await fetcher.close()

  if (!essRes?.opinionData?.[ticker]) {
    logger.warn(`No Fidelity opinion data found for ${ticker}`)
    return {
      fidelityAnalystsUpdatedAt: makePrettyDate(),
      fidelityAnalystRatings: "",
      fidelitySummaryScore: "",
      fidelityMorganStanleyRecommendation: "",
      zacksRecommendation: "",
      fordRecommendation: "",
      jefferiesRecommendation: "",
      equitySummaryScoreHistory: "",
      argusAnalystDate,
      argusAnalystLink,
      zacksDate,
      zacksLink,
    }
  }

  const { essCurrentRating, essScore, firmOpinions, equitySummaryScore1YearHistory } =
    essRes.opinionData[ticker]

  const zacksOpinion = firmOpinions?.find(({ firmId }) => firmId === 993)
  const morganStanleyOpinion = firmOpinions?.find(({ firmId }) => firmId === 75)
  const fordOpinion = firmOpinions?.find(({ firmId }) => firmId === 696)
  const jefferiesOpinion = firmOpinions?.find(({ firmId }) => firmId === 36)

  const [upDownGrades, otherRatings] = partition(
    firmOpinions,
    firmOpinion =>
      isString(firmOpinion.currentNormalizedRating) &&
      isString(firmOpinion.previousNormalizedRating) &&
      firmOpinion.currentNormalizedRating.toLowerCase() !==
        firmOpinion.previousNormalizedRating.toLowerCase(),
  )

  const fidelityAnalystRatings = upDownGrades.length
    ? formatRatings(upDownGrades) + "\n\n" + formatRatings(otherRatings)
    : formatRatings(otherRatings)

  return {
    fidelityAnalystsUpdatedAt: makePrettyDate(),
    fidelityAnalystRatings,
    fidelitySummaryScore: `${essScore} ${essCurrentRating}`,
    fidelityMorganStanleyRecommendation: formatFidelityStarmine(morganStanleyOpinion),
    zacksRecommendation: formatFidelityStarmine(zacksOpinion, { includeDate: false }),
    fordRecommendation: formatFidelityStarmine(fordOpinion),
    jefferiesRecommendation: formatFidelityStarmine(jefferiesOpinion),
    equitySummaryScoreHistory: (isArray(equitySummaryScore1YearHistory)
      ? equitySummaryScore1YearHistory
      : []
    )
      .map(({ description, asOfDate }) => `${description} ${formatMsDate(asOfDate)}`)
      .reverse()
      .join("\n"),
    argusAnalystDate,
    argusAnalystLink,
    zacksDate,
    zacksLink,
  }
}

exports.fetch = (ticker, browser) =>
  handleFetch(logger => fetchData(ticker, browser, logger), ticker, "FIDELITY")
