const data = require("./testOutput.json")
const _ = require("lodash")

const res = _.fromPairs(_.zip(data.analysts, data.reportHrefs)) /* ?+*/
