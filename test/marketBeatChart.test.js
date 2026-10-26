const { buildAnalystCharts, ratingBucket, parseConsensusTargets } = require("../src/sources/marketBeat")

describe("ratingBucket", () => {
  it.each([
    ["Sell", 0],
    ["Strong Sell", 0],
    ["Sell (D+)", 0],
    ["Underweight", 1],
    ["Underperform", 1],
    ["Hold", 2],
    ["Neutral", 2],
    ["Equal Weight", 2],
    ["Hold (C+)", 2],
    ["Overweight", 3],
    ["Outperform", 3],
    ["Market Outperform", 3],
    ["Buy", 4],
    ["Strong-Buy", 4],
    ["Buy (B+)", 4],
    ["N/A", -1],
  ])("maps %s to %s", (rating, bucket) => {
    expect(ratingBucket(rating)).toBe(bucket)
  })
})

describe("buildAnalystCharts", () => {
  const now = new Date(2026, 9, 23)

  it("counts latest rating per firm, sell→buy", () => {
    const rows = [
      { date: "10/20/2026", firm: "UBS", ratingTo: "Buy" },
      { date: "9/1/2026", firm: "UBS", ratingTo: "Hold" },
      { date: "10/1/2026", firm: "Barclays", ratingTo: "Underweight" },
      { date: "8/1/2026", firm: "RBC", ratingTo: "Outperform" },
      { date: "7/1/2026", firm: "JPMorgan", ratingTo: "Neutral" },
    ]
    const charts = buildAnalystCharts(rows, now)
    expect(charts.marketBeatChartCurrent).toEqual([0, 1, 1, 1, 1])
    expect(charts.marketBeatChartCurrentNum).toBe(4)
  })

  it("rebuilds older snapshots from history", () => {
    const rows = [
      { date: "10/20/2026", firm: "UBS", ratingTo: "Buy" },
      { date: "8/20/2026", firm: "UBS", ratingTo: "Hold" },
      { date: "6/20/2026", firm: "Barclays", ratingTo: "Sell" },
    ]
    const charts = buildAnalystCharts(rows, now)
    expect(charts.marketBeatChartCurrent).toEqual([1, 0, 0, 0, 1])
    expect(charts.marketBeatChartMonthAgo).toEqual([1, 0, 1, 0, 0])
    expect(charts.marketBeatChartThreeMonthAgo).toEqual([1, 0, 0, 0, 0])
  })

  it("returns empty when nothing maps", () => {
    expect(buildAnalystCharts([{ date: "10/1/2026", firm: "X", ratingTo: "N/A" }])).toEqual({})
  })
})

describe("parseConsensusTargets", () => {
  it("reads the FAQ sentence", () => {
    expect(
      parseConsensusTargets(
        "According to the research reports of 43 Wall Street equities research analysts, the average twelve-month stock price forecast for Apple is $340.12, with a high forecast of $400.00 and a low forecast of $245.00.",
      ),
    ).toEqual({
      marketBeatLowTarget: "245.00",
      marketBeatAverageTarget: "340.12",
      marketBeatHighTarget: "400.00",
      marketBeatPriceTargets: "$245.00 - $340.12 - $400.00",
      marketBeatPriceTargetNum: 43,
    })
  })

  it("falls back to the visible consensus paragraph", () => {
    expect(
      parseConsensusTargets(
        "According to the 55 analysts' twelve-month price targets for NVIDIA, the average price target is $321.47. The highest price target for NVDA is $515.00, while the lowest price target for NVDA is $210.00.",
      ),
    ).toEqual({
      marketBeatLowTarget: "210.00",
      marketBeatAverageTarget: "321.47",
      marketBeatHighTarget: "515.00",
      marketBeatPriceTargets: "$210.00 - $321.47 - $515.00",
      marketBeatPriceTargetNum: 55,
    })
  })

  it("returns blanks when neither pattern matches", () => {
    expect(parseConsensusTargets("<p>no targets here</p>")).toEqual({
      marketBeatLowTarget: "",
      marketBeatAverageTarget: "",
      marketBeatHighTarget: "",
      marketBeatPriceTargets: "",
      marketBeatPriceTargetNum: "",
    })
  })
})
