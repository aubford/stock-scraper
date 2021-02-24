GLOBAL.million = 1000000
GLOBAL._ = require("lodash")
require("./stock_tool.js")
const data = require("./data/nlokData.json")


const companyData = buildCompanyData(data, [
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
])
