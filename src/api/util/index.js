const str = require("./str")
const www = require("./www")
const xpath = require("./xpath")
const mathUtil = require("./math")

module.exports = {
  ...str,
  ...www,
  ...xpath,
  ...mathUtil,
}
