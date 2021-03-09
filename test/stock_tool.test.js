/**
 * @typedef test {function}
 */

global.million = 1000000
const buildCompanyData = require("../src/buildCompanyData.js")
const data = require("./data/bsxData.json")

const wsjData = [
  "19",
  "21",
  "19",
  "2",
  "1",
  "1",
  "5",
  "5",
  "6",
  "0",
  "0",
  "0",
  "0",
  "0",
  "0",
]

test("main", () => {
  const companyData = buildCompanyData(data, wsjData)
  expect(companyData.salesPerShareMRQ).toBeTruthy()
})
