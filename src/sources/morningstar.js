const fetchPdfData = require("../fetchers/fetchPdfData")
const { handleFetch } = require("./util/www")

const USD_PRICE = /([\d,]+\.?\d*)\s*USD(?!\s*(Bil|Mil|B|M)\b)/i
const FVE_DATE = /(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/

const UNCERTAINTY = ["Very High", "High", "Medium", "Low"]
const CAPITAL_ALLOCATION = ["Exemplary", "Standard", "Poor"]
const MOAT = ["Narrow", "Wide", "None"]

/**
 * Header block only — later sections reuse labels like "Uncertainty".
 * @param {string} text
 * @returns {string}
 */
const headerText = text => {
  const cut = text.search(/\nContents\b|\nAnalyst Note\b|\nBusiness Description\b/)
  return cut > 0 ? text.slice(0, cut) : text.slice(0, 4000)
}

/**
 * @param {string} text
 * @param {string} label
 * @param {string[]} known
 * @returns {string}
 */
const pickAfterLabel = (text, label, known) => {
  const ordered = [...known].sort((a, b) => b.length - a.length)
  const re = new RegExp(
    `${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:TM)?\\s*[\\n\\r]+\\s*(${ordered
      .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})\\b`,
    "i",
  )
  return text.match(re)?.[1] || ""
}

/**
 * @param {string} text
 * @returns {{ morningstarFairValue: string, morningstarDate: string, morningstarUncertainty: string, morningstarCapitalAllocation: string, morningstarMoat: string }}
 */
const parseMorningstarText = text => {
  const header = headerText(text)

  const fve =
    header.match(
      /Fair Value Estimate\s+([\d,]+\.?\d*)\s*USD\s+(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i,
    ) || header.match(/Fair Value Estimate[\s\S]{0,80}?([\d,]+\.?\d*)\s*USD/i)

  const fairValue = fve ? fve[1].replace(/,/g, "") : ""
  const date =
    (fve && fve[2]) ||
    header.match(/Fair Value Estimate[\s\S]{0,120}?(\d{1,2}\s+[A-Za-z]{3}\s+\d{4})/i)?.[1] ||
    ""

  // Fallback if the USD/date regex missed a slightly different layout.
  const usdFallback = !fairValue
    ? header.match(new RegExp(`Fair Value Estimate[\\s\\S]{0,40}?${USD_PRICE.source}`, "i"))
    : null

  return {
    morningstarFairValue: fairValue || (usdFallback ? usdFallback[1].replace(/,/g, "") : ""),
    morningstarDate: date || (usdFallback && header.match(FVE_DATE)?.[1]) || "",
    morningstarUncertainty: pickAfterLabel(header, "Uncertainty", UNCERTAINTY),
    morningstarCapitalAllocation: pickAfterLabel(
      header,
      "Capital Allocation",
      CAPITAL_ALLOCATION,
    ),
    morningstarMoat: pickAfterLabel(header, "Economic Moat", MOAT),
  }
}

/**
 * @param {string} ticker
 * @param {string} url
 * @param {Browser} browser
 * @param {Logger} logger
 * @returns {Promise<{morningstarFairValue:*, morningstarUncertainty:*, morningstarDate:*, morningstarCapitalAllocation:*, morningstarMoat:*}>}
 */
const fetchData = async (ticker, url, browser, logger) => {
  if (!url) {
    return {}
  }

  return await fetchPdfData({
    ticker,
    browser,
    analystName: "MORNINGSTAR",
    url,
    timeout: MORNINGSTAR_TIMEOUT,
    extract: text => {
      const parsed = parseMorningstarText(text)
      logger.log(
        parsed.morningstarFairValue
          ? `parsed FVE ${parsed.morningstarFairValue}`
          : "no Fair Value Estimate in PDF text",
      )
      return parsed
    },
  })
}

exports.fetch = (ticker, url, browser) =>
  handleFetch(logger => fetchData(ticker, url, browser, logger), ticker, "MORNINGSTAR")
exports.parseMorningstarText = parseMorningstarText
