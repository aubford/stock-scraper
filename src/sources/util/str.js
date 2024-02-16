const { first, last, endsWith } = require("lodash")

const chars = text => text.replace(/\s/g, "")

const getFirstLastValue = str => {
  const split = str ? str.split(/\s/) : []
  return [first(split), last(split)]
}

/**
 * @param {string} text
 * @returns {string}
 */
const extractNumbers = text =>
  text && text !== "--" ? text.match(/[\d,\\.]/g)?.join("")  || "" : ""

const millBillStrToNum = str => {
  const num = extractNumbers(str)
  if (endsWith(str, "M") || endsWith(str, "B")) {
    const mult = endsWith(str, "M") ? 1000 ** 2 : 1000 ** 3
    return num * mult
  }
  return num
}

module.exports = {
  chars,
  getFirstLastValue,
  extractNumbers,
  millBillStrToNum,
}
