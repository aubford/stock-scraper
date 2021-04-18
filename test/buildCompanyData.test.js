const { cloneDeep, sortBy, last } = require("lodash")
const buildCompanyData = require("../src/buildCompanyData")
const { orZero } = require("../src/buildCompanyDataUtil")
const wsjData = require("./data/wsjC.json")
const bflyData = require("./data/bflyData.json")
const bsxData = require("./data/bsxData.json")
const citiData = require("./data/cData.json")
const crmData = require("./data/crmData.json")
const cscoData = require("./data/cscoData.json")
const disData = require("./data/disData.json")
const dhrData = require("./data/crmData.json")
const fateData = require("./data/fateData.json")
const jdData = require("./data/jdData.json")
const ntdoyData = require("./data/ntdoyData.json")
const powerData = require("./data/powerData.json")
const slackData = require("./data/slackData.json")
const slfData = require("./data/slfData.json")
const uvspData = require("./data/uvspData.json")

const sortDates = arr => sortBy(arr, date => new Date(date))
const runTests = data => {
  const o = buildCompanyData(data, wsjData)

  expect(o).toMatchSnapshot()

  if (o.mostRecentQuarter) {
    if (o.endDateIsQuartChart) {
      // Last chart date item = MRQ
      expect(o.mostRecentQuarter).toContain(last(o.endDateIsQuartChart))
      expect(o.mostRecentQuarter).toContain(last(o.endDateCfQuartChart))
      expect(o.mostRecentQuarter).toContain(last(o.endDateBsQuartChart))
      // Last arbitrary chart item is current
      expect(last(o.netIncomeIsQuartChart)).toBe(o.netIncome)
      // Last dividend chart item is current
      if (o.dividendsPaid) {
        expect(last(o.dividendChart)).toBe(Math.abs(o.dividendsPaid))
      }
    }

    if (o.endDateIsAnnuChart) {
      // Last chart date item = LFY
      expect(o.lastFiscalYearEnd).toContain(last(o.endDateIsAnnuChart))
      expect(o.lastFiscalYearEnd).toContain(last(o.endDateCfAnnuChart))
      expect(o.lastFiscalYearEnd).toContain(last(o.endDateBsAnnuChart))
    }
  } else {
    expect(o.netIncome).toBeUndefined()
    expect(o.dividendsPaid).toBeUndefined()
  }

  if (o.endDateIsQuartChart) {
    // Charts are sorted correctly/predictably
    expect(o.endDateIsQuartChart).toEqual(sortDates(o.endDateIsQuartChart))
    expect(o.endDateCfQuartChart).toEqual(sortDates(o.endDateCfQuartChart))
    expect(o.endDateBsQuartChart).toEqual(sortDates(o.endDateBsQuartChart))
  }
}

test("Schmangled data", () => {
  const clonedData = cloneDeep(citiData)
  const { incomeStatementHistoryQuarterly } = clonedData.quoteSummary.result[0]

  const [a, b, c, d] = incomeStatementHistoryQuarterly.incomeStatementHistory
  incomeStatementHistoryQuarterly.incomeStatementHistory = [b, c, a, d]

  const o = buildCompanyData(clonedData, wsjData)

  expect(o.endDateIsQuartChart).not.toEqual(sortDates(o.endDateIsQuartChart))
})

test.only("DHR", () => {
  runTests(dhrData)
})

test("FATE", () => {
  runTests(fateData)
})

test("C", () => {
  runTests(citiData)
})

test("BSX", () => {
  runTests(bsxData)
})

test("CRM", () => {
  runTests(crmData)
})

test("CSCO", () => {
  runTests(cscoData)
})

test("DIS", () => {
  runTests(disData)
})

test("NTDOY", () => {
  runTests(ntdoyData)
})

test("PWCDF", () => {
  runTests(powerData)
})

test("WORK", () => {
  runTests(slackData)
})

test("SLF", () => {
  runTests(slfData)
})

test("UVSP", () => {
  runTests(uvspData)
})

test("BFLY", () => {
  runTests(bflyData)
})

test("JD", () => {
  runTests(jdData)
})

test("orZero", () => {
  //noinspection JSUnusedGlobalSymbols
  const testObj = {
    returnTrue: () => true,
    returnStr: () => "yay",
    returnFalse: () => false,
    returnUndefined: () => {
      return testObj.noop
    },
  }
  expect(orZero(15)).toBe(15)
  expect(orZero(() => testObj.returnStr())).toBe("yay")
  expect(orZero(testObj.returnTrue())).toBe(true)

  expect(orZero(10, 15)).toBe(15)
  expect(orZero(() => testObj.returnTrue(), 16)).toBe(16)

  expect(orZero(0, 15)).toBe(0)
  expect(orZero(() => testObj.returnFalse(), 15)).toBe(0)
  expect(orZero(testObj.noop, 10)).toBe(0)
  expect(orZero(() => testObj.noop(), 15)).toBe(0)
  expect(orZero(() => testObj.noop.noop)).toBe(0)

  expect(orZero(testObj.returnTrue(), () => testObj.returnUndefined())).toBe(undefined)
  expect(orZero((5 + testObj.noop) * 4)).toBe(0)
  expect(orZero(5 + testObj.noop)).toBe(0)
})
