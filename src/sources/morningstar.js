const fetchPdfData = require("../fetchers/fetchPdfData")
const { handleFetch } = require("./util/www")

const PAGE1 = `//div[@class='page'][@data-page-number='1']`
const USD_PRICE = /\d[\d,]*\.?\d*\s*USD(?!\s*(Bil|Mil|B|M)\b)/i
const FVE_DATE = /\d{1,2}\s+[A-Za-z]{3}\s+\d{4}/

const UNCERTAINTY = new Set(["Very High", "High", "Medium", "Low"])
const CAPITAL_ALLOCATION = new Set(["Exemplary", "Standard", "Poor"])
const MOAT = new Set(["Narrow", "Wide", "None"])

/**
 * Header labels live in pdf.js text-layer spans (`role='presentation'`).
 * Contents-list entries often include a date in parentheses and are skipped.
 *
 * @param {string} label
 * @returns {string}
 */
const labelBlock = label =>
  `(${PAGE1}//span[@role='presentation'][starts-with(normalize-space(.), '${label}')][not(contains(., '('))]/ancestor::span[@class='markedContent'][1])[1]`

/**
 * @param {string} label
 * @param {number} [limit]
 * @returns {string}
 */
const followingFrom = (blockXpath, limit = 4) =>
  `(${blockXpath}/following-sibling::span[@class='markedContent'][normalize-space()])[position() <= ${limit}]`

const followingBlocks = (label, limit = 4) => followingFrom(labelBlock(label), limit)

// Some grouped reports split the header into "Economic" + "Moat" markedContents.
const MOAT_BLOCK = `(${labelBlock("Economic Moat")} | (${PAGE1}//span[@role='presentation'][normalize-space(.)='Moat']/ancestor::span[@class='markedContent'][1][preceding-sibling::span[@class='markedContent'][contains(normalize-space(.), 'Economic')]]))[1]`

/**
 * @param {string|string[]|undefined} value
 * @returns {string[]}
 */
const toTextList = value => {
  if (Array.isArray(value)) return value
  if (typeof value === "string" && value) return [value]
  return []
}

/**
 * @param {string|string[]|undefined} texts
 * @param {Set<string>} known
 * @returns {string}
 */
const pickKnown = (texts, known) => {
  const values = [...known].sort((a, b) => b.length - a.length)
  for (const text of toTextList(texts).map(t => t.replace(/\s+/g, " ").trim())) {
    const match = values.find(value => text === value || text.includes(value))
    if (match) return match
  }
  return ""
}

/**
 * @param {MyPage} page
 * @param {string} label
 * @param {Set<string>} known
 * @returns {Promise<string>}
 */
const pickLabeledValue = async (page, label, known, blockXpath = labelBlock(label)) => {
  const [block, siblings] = await Promise.all([
    page.getTextByX(blockXpath),
    page.getTextByX(followingFrom(blockXpath)),
  ])
  return pickKnown([...toTextList(block), ...toTextList(siblings)], known)
}

/**
 * @param {string|string[]|undefined} blockText
 * @param {string|string[]|undefined} siblingTexts
 * @returns {{ morningstarFairValue: string, morningstarDate: string }}
 */
const parseFairValue = (blockText, siblingTexts) => {
  const texts = [...toTextList(blockText), ...toTextList(siblingTexts)]
    .map(text => text.replace(/\s+/g, " ").trim())
    .filter(text => text && !/Price\/FVE/i.test(text))

  const usd = texts.map(text => text.match(USD_PRICE)).find(Boolean)
  const date = texts.map(text => text.match(FVE_DATE)).find(Boolean)

  return {
    morningstarFairValue: usd ? usd[0].replace(/\s*USD/i, "").trim() : "",
    morningstarDate: date ? date[0] : "",
  }
}

/**
 * Grouped layout: Fair Value Estimate label + USD + date share one markedContent.
 * Other header fields may still be split across sibling markedContents.
 *
 * @param {MyPage} page
 * @param {string|string[]} fveBlockText
 * @returns {Promise<{morningstarFairValue: string, morningstarDate: string, morningstarUncertainty: string, morningstarCapitalAllocation: string, morningstarMoat: string}>}
 */
const fetchGroupedReport = async (page, fveBlockText) => {
  const [morningstarUncertainty, morningstarCapitalAllocation, morningstarMoat] = await Promise.all([
    pickLabeledValue(page, "Uncertainty", UNCERTAINTY),
    pickLabeledValue(page, "Capital Allocation", CAPITAL_ALLOCATION),
    pickLabeledValue(page, "Economic Moat", MOAT, MOAT_BLOCK),
  ])

  return {
    ...parseFairValue(fveBlockText, []),
    morningstarUncertainty,
    morningstarCapitalAllocation,
    morningstarMoat,
  }
}

/**
 * Split layout: each label / value / date is its own markedContent sibling.
 *
 * @param {MyPage} page
 * @returns {Promise<{morningstarFairValue: string, morningstarDate: string, morningstarUncertainty: string, morningstarCapitalAllocation: string, morningstarMoat: string}>}
 */
const fetchSplitReport = async page => {
  const [fveSiblings, morningstarUncertainty, morningstarCapitalAllocation, morningstarMoat] =
    await Promise.all([
      page.getTextByX(followingBlocks("Fair Value Estimate", 8)),
      pickLabeledValue(page, "Uncertainty", UNCERTAINTY),
      pickLabeledValue(page, "Capital Allocation", CAPITAL_ALLOCATION),
      pickLabeledValue(page, "Economic Moat", MOAT, MOAT_BLOCK),
    ])

  return {
    ...parseFairValue("", fveSiblings),
    morningstarUncertainty,
    morningstarCapitalAllocation,
    morningstarMoat,
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
    xPathArr: [labelBlock("Fair Value Estimate")],
    timeout: MORNINGSTAR_TIMEOUT,
    extract: async page => {
      const fveBlockText = await page.getTextByX(labelBlock("Fair Value Estimate"))
      const grouped = USD_PRICE.test(toTextList(fveBlockText).join(" "))
      logger.log(grouped ? "grouped layout" : "split layout")
      return grouped ? fetchGroupedReport(page, fveBlockText) : fetchSplitReport(page)
    },
  })
}

exports.fetch = (ticker, url, browser) =>
  handleFetch(logger => fetchData(ticker, url, browser, logger), ticker, "MORNINGSTAR")
