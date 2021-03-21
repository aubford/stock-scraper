const { sortBy } = require("lodash")
const buildCompanyData = require("../src/buildCompanyData")
const wsjData = require("./data/wsjC.json")
const citiData = require("./data/citiData.json")
const attData = require("./data/attData.json")
const axpData = require("./data/axpData.json")
const biibData = require("./data/biibData.json")
const blkData = require("./data/blkData.json")
const bsxData = require("./data/bsxData.json")
const crmData = require("./data/crmData.json")
const cscoData = require("./data/cscoData.json")
const deData = require("./data/deData.json")
const disData = require("./data/disData.json")
const fuboData = require("./data/fuboData.json")
const gsData = require("./data/gsData.json")
const hubsData = require("./data/hubsData.json")
const nlokData = require("./data/nlokData.json")
const ntdoyData = require("./data/ntdoyData.json")
const nvsData = require("./data/nvsData.json")
const powerData = require("./data/powerData.json")
const radData = require("./data/radData.json")
const sedgData = require("./data/sedgData.json")
const slackData = require("./data/slackData.json")
const slfData = require("./data/slfData.json")
const uvspData = require("./data/uvspData.json")
const jdData = require("./data/jdData.json")
const bflyData = require("./data/bflyData.json")

const sortDates = arr => sortBy(arr, date => new Date(date)).reverse()
const runTests = data => {
  const o = buildCompanyData(data, wsjData)

  expect(o.mostRecentQuarter).toContain(o.endDateQuartChart[0])
  expect(o.endDateQuartChart).toEqual(sortDates(o.endDateQuartChart))
}

test("Schmangled data", () => {
  const o = buildCompanyData(citiData, wsjData)

  const [dateA, dateB, dateC, dateD] = o.endDateQuartChart
  o.endDateQuartChart = [dateC, dateA, dateB, dateD]
  expect(o.endDateQuartChart).not.toEqual(sortDates(o.endDateQuartChart))
})

test("C", () => {
  runTests(citiData)
})

test("BLK", () => {
  runTests(blkData)
})

test("T", () => {
  runTests(attData)
})

test("AXP", () => {
  runTests(axpData)
})

test("BIIB", () => {
  runTests(biibData)
})

test.skip("BSX", () => {
  runTests(bsxData)
})

test("CRM", () => {
  runTests(crmData)
})

test("CSCO", () => {
  runTests(cscoData)
})

test("DE", () => {
  runTests(deData)
})

test("DIS", () => {
  runTests(disData)
})

test("FUBO", () => {
  runTests(fuboData)
})

test("GS", () => {
  runTests(gsData)
})

test("HUBS", () => {
  runTests(hubsData)
})

test("NLOK", () => {
  runTests(nlokData)
})

test("NTDOY", () => {
  runTests(ntdoyData)
})

test("NVS", () => {
  runTests(nvsData)
})

test("PWCDF", () => {
  runTests(powerData)
})

test("RAD", () => {
  runTests(radData)
})

test("SEDG", () => {
  runTests(sedgData)
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
