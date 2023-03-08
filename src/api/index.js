const argusAnalyst = require("./argusAnalyst")
const boa = require("./boa")
const cfra = require("./cfra")
const fidelityAnalysts = require("./fidelityAnalysts")
const fidelityStats = require("./fidelityStats")
const ford = require("./ford")
const moodys = require("./moodys")
const morningstar = require("./morningstar")
const newConstructs = require("./newConstructs")
const street = require("./street")
const td = require("./td")
const tipranks = require("./tipranks")
const wsj = require("./wsj")
const yahoo = require("./yahoo")
const zacks = require("./zacks")
const zacksReport = require("./deprecated/zacksReport")

module.exports = {
  argusAnalyst,
  cfra,
  morningstar,
  ford,
  tipranks,
  zacksReport,
  yahoo,
  wsj,
  newConstructs,
  moodys,
  td,
  boa,
  fidelityStats,
  fidelityAnalysts,
  street,
  zacks,
}
