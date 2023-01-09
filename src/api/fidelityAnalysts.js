const PageDataFetcher = require("../PageDataFetcher")
const { makePrettyDate } = require("../util")

/**
 * @param {string} ticker
 * @param  {Browser} browser
 * @returns Promise<Object>
 */
exports.fetch = async (ticker, browser) => {
  const formatFidelityStarmine = (name, rating) =>
    `${(name || "").substring(0, 14)} - ${rating}`

  const reportRowXpathFrag = name =>
    `//table[@data-tc="table-analyst-reports"]/tbody/tr[.//a="${name}"]`

  const fetcher = new PageDataFetcher(FIDELITY, ticker, browser, {
    timeout: FIDELITY_ANALYST_TIMEOUT,
  })
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

  await fetcher.clickForXpath(`//*[@href="#pvd3-action__caret-right"]`)

  const [starmines, fidelitySummaryScore] = await fetcher.fetchPageData([
    `//table[@data-tc="table-firm-opinions"]/tbody/tr/td[position()=1 or position()=3]//text()`,
    `//h2[contains(@class,'headingTwo')]/text()[5]`,
  ])

  const [
    fidelityStarmineOneName,
    fidelityStarmineOneRating,
    fidelityStarmineTwoName,
    fidelityStarmineTwoRating,
    fidelityStarmineThreeName,
    fidelityStarmineThreeRating,
    fidelityStarmineFourName,
    fidelityStarmineFourRating,
    fidelityStarmineFiveName,
    fidelityStarmineFiveRating,
  ] = starmines.filter(e => e.trim())

  await fetcher.close()

  const res = {
    fidelityAnalystsUpdatedAt: makePrettyDate(),
    fidelityStarmineFive: formatFidelityStarmine(
      fidelityStarmineFiveName,
      fidelityStarmineFiveRating
    ),
    fidelityStarmineFour: formatFidelityStarmine(
      fidelityStarmineFourName,
      fidelityStarmineFourRating
    ),
    fidelityStarmineOne: formatFidelityStarmine(
      fidelityStarmineOneName,
      fidelityStarmineOneRating
    ),
    fidelityStarmineThree: formatFidelityStarmine(
      fidelityStarmineThreeName,
      fidelityStarmineThreeRating
    ),
    fidelityStarmineTwo: formatFidelityStarmine(
      fidelityStarmineTwoName,
      fidelityStarmineTwoRating
    ),
    fidelitySummaryScore: fidelitySummaryScore ? fidelitySummaryScore.trim() : "",
    argusAnalystDate,
    argusAnalystLink,
    zacksDate,
    zacksLink,
  }

  return res
}
