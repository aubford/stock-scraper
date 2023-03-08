const { prevSiblingTextIs } = require("../util")
const fetchPdfData = require("../../fetchPdfData")

// deprecated for now
exports.fetch = async (ticker, browser, argusResearchLink) => {
  const xpathHelper = `text()='M' or text()='H' or text()='L'`
  const [
    argusResearchTarget,
    argusResearchRating,
    [
      argusResearchManagement,
      argusResearchSafety,
      argusResearchFinancialStrength,
      argusResearchGrowth,
      argusResearchValue,
    ] = [],
  ] = await fetchPdfData({
    ticker,
    browser,
    analystName: ARGUS_RESEARCH,
    url: argusResearchLink,
    xPathArr: [
      `//span[contains(text(),"Target ") and contains(text(),":")]/following-sibling::span[1]`,
      prevSiblingTextIs("Argus Rating:", 3),
      `//span[${xpathHelper}]/following-sibling::span[position()=1 and (${xpathHelper})]`,
    ],
    timeout: ARGUS_RESEARCH_TIMEOUT,
  })

  return {
    argusResearchFinancialStrength,
    argusResearchGrowth,
    argusResearchManagement,
    argusResearchRating,
    argusResearchSafety,
    argusResearchTarget,
    argusResearchValue,
  }
}
