const { extractNumbers } = require("./util/str")
const { sum } = require("lodash")

// Action curve (Desmos-tuned)
const HOLD = 0.15
const SELL_CAP = 0.7
const D_POS = 0.1
const S_POS = 0.2

// Sell side: hill S-curve. A crosses 0 at ZERO_PCT; ~F_AT_CAP of the way to −SELL_CAP at CAP_PCT.
const ZERO_PCT = 2
const CAP_PCT = 60
const F_AT_CAP = 0.95
const tFromReducePct = pct => -Math.log(Math.max(1 - pct / 100, 0.0001))
const T_ZERO = tFromReducePct(ZERO_PCT)
const T_CAP = tFromReducePct(CAP_PCT)
const F_AT_ZERO = HOLD / (HOLD + SELL_CAP)
const P_NEG =
  Math.log(((1 - F_AT_CAP) / F_AT_CAP) * (F_AT_ZERO / (1 - F_AT_ZERO))) /
  Math.log(T_ZERO / T_CAP)
const T_HALF = T_ZERO * Math.pow((1 - F_AT_ZERO) / F_AT_ZERO, 1 / P_NEG)

// Conviction: half-credit at 1% portfolio weight
const W0 = 1
const K = 2

// Market-cap adjustment (M_REF in dollars)
const M_REF = 50e9
const BETA = 0.3

// Scale so per-manager extremes match the old step score (hold 0.75, big-buy 3, sellout -2.25).
const SCORE_SCALE = 3

const MAX_CHART_QUARTERS = 20

/**
 * Soft dead-zone then ramp for the buy side.
 * @param {number} t log share-change, t >= 0
 * @returns {number}
 */
const deadZonePos = t => {
  if (!(t > 0)) return 0
  return 1 - Math.exp((-t * t) / (D_POS * D_POS + S_POS * t))
}

/**
 * Sell S-curve ramp: 0 at t=0, F_AT_ZERO at T_ZERO (A=0), F_AT_CAP at T_CAP, →1 as t→∞.
 * @param {number} t |log share-change|, t >= 0
 * @returns {number}
 */
const sellRamp = t => {
  if (!(t > 0)) return 0
  return 1 / (1 + Math.pow(T_HALF / t, P_NEG))
}

/**
 * Share-count % change for scoring. Buy → +∞; Sell → −100.
 * @param {string} activity
 * @returns {number}
 */
const getShareChangePercent = activity => {
  if (!activity || activity === "0") return 0
  if (activity === "Buy" || activity.startsWith("Buy ")) return Number.POSITIVE_INFINITY
  const normalized = activity.replace(/^Sell\b/, "Reduce")
  const magnitude = Number(extractNumbers(normalized))
  if (!Number.isFinite(magnitude)) return 0
  if (normalized.includes("Reduce")) return -magnitude
  if (normalized.includes("Add")) return magnitude
  return 0
}

/**
 * Continuous action score in about [−SELL_CAP, +1].
 * @param {string} activity
 * @returns {number}
 */
const getActionScore = activity => {
  const x = getShareChangePercent(activity)
  if (!Number.isFinite(x) && x > 0) return 1
  const r = Math.log(Math.max(1 + x / 100, 0.0001))
  if (r >= 0) return HOLD + (1 - HOLD) * deadZonePos(r)
  return HOLD - (HOLD + SELL_CAP) * sellRamp(-r)
}

/**
 * @param {number} weightPct portfolio weight in percent (1 = 1%)
 * @param {number} [marketCap] dollars
 * @returns {number} conviction in [0, 1)
 */
const getConviction = (weightPct, marketCap) => {
  if (!(weightPct > 0)) return 0
  const mult =
    Number.isFinite(marketCap) && marketCap > 0 ? Math.pow(M_REF / marketCap, BETA) : 1
  const u = weightPct * mult
  const uk = Math.pow(u, K)
  const w0k = Math.pow(W0, K)
  return uk / (uk + w0k)
}

/**
 * Stake for a manager-quarter: max(weight before, weight after).
 * Missing pct history → 0 (contribution dropped).
 * @param {Map<number, number>} pcts
 * @param {number} quarter
 * @returns {number}
 */
const getStakeWeight = (pcts, quarter) => {
  if (!pcts?.size) return 0
  let before = 0
  let after = 0
  let sawQuarter = false
  ;[...pcts.keys()]
    .sort((a, b) => a - b)
    .forEach(q => {
      const pct = pcts.get(q) || 0
      if (q < quarter) before = pct
      if (q === quarter) {
        after = pct
        sawQuarter = true
      }
    })
  // Carried-forward hold with no row this quarter: stake is the prior weight.
  if (!sawQuarter && before > 0) after = before
  return Math.max(before, after)
}

/**
 * @param {number} n
 * @returns {number}
 */
const round2 = n => Number(n.toFixed(2))

/**
 * One sentiment value per quarter (same length/order as entriesByQuarter).
 * @param {{quarter: number, code: string, activity: string}[][]} entriesByQuarter
 * @param {Map<string, {pcts: Map<number, number>}>} timelines
 * @param {number} [marketCap] dollars
 * @returns {number[]}
 */
const getQuarterSentiments = (entriesByQuarter, timelines, marketCap) =>
  entriesByQuarter.map(entries =>
    round2(
      SCORE_SCALE *
        sum(
          entries.map(({ quarter, code, activity }) => {
            const pcts = timelines.get(code)?.pcts
            const weight = getStakeWeight(pcts, quarter)
            return getActionScore(activity) * getConviction(weight, marketCap)
          }),
        ),
    ),
  )

/**
 * @param {number[]} sentiments
 * @returns {{dataromaSentiment: number, dataromaSentimentChart: number[]}}
 */
const summarizeSentiments = sentiments => ({
  dataromaSentiment: sentiments[sentiments.length - 1] ?? 0,
  dataromaSentimentChart: sentiments.slice(-MAX_CHART_QUARTERS),
})

module.exports = {
  HOLD,
  SELL_CAP,
  D_POS,
  S_POS,
  ZERO_PCT,
  CAP_PCT,
  F_AT_CAP,
  W0,
  K,
  M_REF,
  BETA,
  SCORE_SCALE,
  getShareChangePercent,
  getActionScore,
  getConviction,
  getStakeWeight,
  getQuarterSentiments,
  summarizeSentiments,
}
