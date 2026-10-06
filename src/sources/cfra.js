const Logger = require("../util/Logger")
const { extractNumbers } = require("./util")
const { makePrettyDate } = require("../util")
const fetchPdfData = require("../fetchers/fetchPdfData")
const { handleFetch } = require("./util/www")

const TARGET_LABEL = "12-Month Target Price"
// STARS reports start with "Stock Report | <date> |", quantitative ones with "Quantitative Stock Report | <date> |"
const HEADER_XPATH = `//span[contains(text(),"Stock Report | ")]`

/**
 * @param {MyPage} page
 * @returns {Promise<{cfraTargetStr: string, cfraDate: string}>}
 */
const extractReport = page =>
  page.evaluate(label => {
    const texts = [...document.querySelectorAll(".textLayer span[role=presentation]")].map(s =>
      s.textContent.trim()
    )
    const labelIdx = texts.indexOf(label)
    const cfraTargetStr =
      labelIdx === -1 ? "" : texts.slice(labelIdx + 1, labelIdx + 6).find(t => /^USD\s/.test(t)) || ""
    const dateMatch = texts.map(t => t.match(/^(?:Quantitative )?Stock Report \| ([^|]+?) \|/)).find(Boolean)
    return { cfraTargetStr, cfraDate: dateMatch ? dateMatch[1] : "" }
  }, TARGET_LABEL)

/**
 * @param {string} ticker
 * @param {string} cfraRating
 * @param {string} cfraLink
 * @param {Browser} browser
 * @returns {Promise<{cfraTarget:string, cfraFairValue: string, cfraUpdatedAt: string, cfraDate: string}>}
 */
const fetchData = async (ticker, cfraRating, cfraLink, browser) => {
  const noCFRACoverage = cfraRating === "no rating"

  if (noCFRACoverage || !cfraLink) {
    new Logger(ticker, "CFRA").log(`NO REPORT OR RATING`)
    return {
      cfraTarget: "",
      cfraFairValue: "",
      cfraDate: "",
      cfraUpdatedAt: makePrettyDate(),
    }
  }

  const { cfraTargetStr, cfraDate } = await fetchPdfData({
    ticker,
    browser,
    analystName: "CFRA",
    url: cfraLink,
    xPathArr: [HEADER_XPATH],
    timeout: CFRA_TIMEOUT,
    extract: extractReport,
  })

  return {
    cfraTarget: extractNumbers(cfraTargetStr),
    cfraFairValue: "",
    cfraDate,
    cfraUpdatedAt: makePrettyDate(),
  }
}

/**
 * @param {string} ticker
 * @param {string} cfraRating
 * @param {string} cfraLink
 * @param {Browser} browser
 * @returns {Promise<{cfraTarget:string, cfraFairValue: string, cfraUpdatedAt: string, cfraDate: string}>}
 */
exports.fetch = (ticker, cfraRating, cfraLink, browser) => {
  return handleFetch(() => fetchData(ticker, cfraRating, cfraLink, browser), ticker, "CFRA")
}
