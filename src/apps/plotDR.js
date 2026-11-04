const fs = require("fs")
const path = require("path")
const { pathToFileURL } = require("url")
const { openInBrowser } = require("../util")
const {
  SCORE_SCALE,
  getActionScore,
  getConviction,
} = require("../sources/dataromaSentiment")

const EXAMPLE_COUNT = 25
const X_MIN = -100
const X_MAX = 200

/** @type {{ portfolioPct: number, marketCap: number, color: string, name: string }[]} */
const SCENARIOS = [
  { portfolioPct: 5, marketCap: 100e9, color: "#6b4eff", name: "5% · $100B" },
  { portfolioPct: 1, marketCap: 10e9, color: "#c4380e", name: "1% · $10B" },
  { portfolioPct: 1, marketCap: 100e9, color: "#0b6bcb", name: "1% · $100B" },
  { portfolioPct: 0.5, marketCap: 10e9, color: "#a12dab", name: "0.5% · $10B" },
  { portfolioPct: 0.5, marketCap: 100e9, color: "#9a6700", name: "0.5% · $100B" },
  { portfolioPct: 0.1, marketCap: 100e9, color: "#1a7f37", name: "0.1% · $100B" },
]

/**
 * @param {number} x share-change percent
 * @returns {string}
 */
const activityFor = x => {
  if (x === 0) return "0"
  if (x <= -100) return "Sell 100.00%"
  if (x < 0) return `Reduce ${(-x).toFixed(4)}%`
  return `Add ${x.toFixed(4)}%`
}

/**
 * @param {number} x
 * @returns {string}
 */
const formatX = x => (Number.isInteger(x) ? String(x) : x.toFixed(1))

/**
 * @param {number} x share-change percent
 * @returns {string}
 */
const labelFor = x => {
  if (x <= -100) return "Sell"
  if (x === 0) return "Hold"
  if (x < 0) return `−${formatX(-x)}%`
  return `+${formatX(x)}%`
}

/**
 * @param {number} x
 * @param {number} portfolioPct
 * @param {number} marketCap
 * @returns {number}
 */
const scoreAt = (x, portfolioPct, marketCap) =>
  SCORE_SCALE * getActionScore(activityFor(x)) * getConviction(portfolioPct, marketCap)

/** @returns {number[]} */
const markerXs = () => {
  const xs = new Set()
  for (let i = 0; i < EXAMPLE_COUNT; i++) {
    xs.add(Number((X_MIN + ((X_MAX - X_MIN) * i) / (EXAMPLE_COUNT - 1)).toFixed(4)))
  }
  for (let x = -10; x <= 10; x++) xs.add(x)
  return [...xs].sort((a, b) => a - b)
}

/**
 * @param {number} portfolioPct
 * @param {number} marketCap
 * @returns {{x: number, y: number}[]}
 */
const sampleCurve = (portfolioPct, marketCap) => {
  const points = []
  for (let x = X_MIN; x <= X_MAX; x += 0.25) {
    points.push({ x, y: scoreAt(x, portfolioPct, marketCap) })
  }
  return points
}

/**
 * @returns {string}
 */
const buildHtml = () => {
  const series = SCENARIOS.map(s => ({
    ...s,
    conviction: getConviction(s.portfolioPct, s.marketCap),
    points: sampleCurve(s.portfolioPct, s.marketCap),
  }))
  const xs = markerXs()
  const markers = xs.map(x => ({
    x,
    label: labelFor(x),
    scores: SCENARIOS.map(s => scoreAt(x, s.portfolioPct, s.marketCap)),
  }))

  const allYs = series.flatMap(s => s.points.map(p => p.y))
  const yMin = Math.floor(Math.min(0, ...allYs) * 10) / 10
  const yMax = Math.ceil(Math.max(0, ...allYs) * 10) / 10
  const width = 3600
  const height = 1920
  const pad = { top: 100, right: 48, bottom: 100, left: 120 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom
  const sx = x => pad.left + ((x - X_MIN) / (X_MAX - X_MIN)) * plotW
  const sy = y => pad.top + ((yMax - y) / (yMax - yMin || 1)) * plotH

  const xGrid = []
  for (let x = X_MIN; x <= X_MAX; x += 1) xGrid.push(x)
  const xLabels = xGrid.filter(x => x % 10 === 0)

  const yGrid = []
  for (let y = yMin; y <= yMax + 1e-9; y = Number((y + 0.1).toFixed(1))) {
    yGrid.push(y)
  }
  const yLabels = yGrid.filter(y => Number((y * 10).toFixed(0)) % 5 === 0)

  const legendItems = series
    .map(
      (s, i) =>
        `<span class="legend-item"><span class="swatch" style="background:${s.color}"></span>${
          s.name
        } (C=${s.conviction.toFixed(3)})</span>`
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Dataroma sentiment curves</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111; background: #fff; }
    h1 { font-size: 32px; font-weight: 600; margin: 0 0 8px; }
    p { margin: 0 0 16px; color: #555; font-size: 18px; }
    .legend { display: flex; flex-wrap: wrap; gap: 20px; margin: 0 0 24px; font-size: 18px; }
    .legend-item { display: inline-flex; align-items: center; gap: 8px; }
    .swatch { width: 18px; height: 18px; border-radius: 3px; display: inline-block; }
    svg { border: 1px solid #ddd; border-radius: 4px; max-width: 100%; height: auto; }
    .axis { stroke: #999; stroke-width: 2; }
    .grid-x { stroke: #eee; stroke-width: 1; }
    .grid-x-major { stroke: #ddd; stroke-width: 1.5; }
    .grid-y { stroke: #eee; stroke-width: 1; }
    .grid-y-major { stroke: #ddd; stroke-width: 1.5; }
    .curve { fill: none; stroke-width: 4; }
    .zero { stroke: #999; stroke-dasharray: 8 8; stroke-width: 2; }
    .label { fill: #666; font-size: 22px; }
    .title { fill: #111; font-size: 28px; font-weight: 600; }
    .dot { stroke: #fff; stroke-width: 2; }
    table { border-collapse: collapse; margin-top: 24px; font-size: 16px; }
    td, th { border: 1px solid #ddd; padding: 6px 14px; text-align: right; }
    th { background: #f6f6f6; text-align: left; }
  </style>
</head>
<body>
  <h1>Dataroma sentiment — one manager</h1>
  <p>S(x) = ${SCORE_SCALE} × A(share change %) × C(portfolio% × market-cap mult)</p>
  <div class="legend">${legendItems}</div>
  <svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img"
       aria-label="Sentiment score versus share-change percent for four scenarios">
    <text class="title" x="${pad.left}" y="48">Score vs share-change %</text>
    ${yGrid
      .map(y => {
        const yy = sy(y)
        const major = yLabels.includes(y)
        return `<line class="${major ? "grid-y-major" : "grid-y"}" x1="${pad.left}" x2="${
          pad.left + plotW
        }" y1="${yy}" y2="${yy}" />`
      })
      .join("\n")}
    ${yLabels
      .map(y => {
        const yy = sy(y)
        return `<text class="label" x="${pad.left - 16}" y="${yy + 8}" text-anchor="end">${y.toFixed(
          1
        )}</text>`
      })
      .join("\n")}
    ${xGrid
      .map(x => {
        const xx = sx(x)
        const major = x % 10 === 0
        return `<line class="${major ? "grid-x-major" : "grid-x"}" x1="${xx}" x2="${xx}" y1="${
          pad.top
        }" y2="${pad.top + plotH}" />`
      })
      .join("\n")}
    ${xLabels
      .map(x => {
        const xx = sx(x)
        return `<text class="label" x="${xx}" y="${height - 36}" text-anchor="middle">${x}</text>`
      })
      .join("\n")}
    <line class="axis" x1="${pad.left}" x2="${pad.left}" y1="${pad.top}" y2="${pad.top + plotH}" />
    <line class="axis" x1="${pad.left}" x2="${pad.left + plotW}" y1="${pad.top + plotH}" y2="${
    pad.top + plotH
  }" />
    <line class="zero" x1="${pad.left}" x2="${pad.left + plotW}" y1="${sy(0)}" y2="${sy(0)}" />
    <line class="zero" x1="${sx(0)}" x2="${sx(0)}" y1="${pad.top}" y2="${pad.top + plotH}" />
    ${series
      .map(s => {
        const pathD = s.points
          .map(
            (p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`
          )
          .join(" ")
        return `<path class="curve" stroke="${s.color}" d="${pathD}" />`
      })
      .join("\n")}
    ${series
      .map(s =>
        markers
          .map(
            m =>
              `<circle class="dot" fill="${s.color}" cx="${sx(m.x)}" cy="${sy(
                scoreAt(m.x, s.portfolioPct, s.marketCap)
              )}" r="6" />`
          )
          .join("\n")
      )
      .join("\n")}
    <text class="label" x="${pad.left + plotW / 2}" y="${height - 8}" text-anchor="middle">share change (%)</text>
    <text class="label" x="28" y="${pad.top + plotH / 2}" text-anchor="middle"
          transform="rotate(-90 28 ${pad.top + plotH / 2})">score</text>
  </svg>
  <table>
    <tr>
      <th>#</th>
      <th>Activity</th>
      ${SCENARIOS.map(s => `<th>${s.name}</th>`).join("")}
    </tr>
    ${markers
      .map(
        (m, i) =>
          `<tr>
            <td>${i + 1}</td>
            <td style="text-align:left">${m.label}</td>
            ${m.scores.map(y => `<td>${y.toFixed(4)}</td>`).join("")}
          </tr>`
      )
      .join("\n")}
  </table>
</body>
</html>`
}

const app = async () => {
  const outPath = path.join(__dirname, "../../debug/dataroma-sentiment-plot.html")
  fs.writeFileSync(outPath, buildHtml(), "utf8")
  console.log(`Wrote ${outPath}`)
  SCENARIOS.forEach(({ name, portfolioPct, marketCap }) => {
    console.log(`  ${name}  C=${getConviction(portfolioPct, marketCap).toFixed(4)}`)
  })
  const fileUrl = pathToFileURL(outPath).href
  console.log(`Opening ${fileUrl}`)
  await openInBrowser(fileUrl)
}

module.exports = app
