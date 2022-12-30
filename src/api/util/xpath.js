const { chars } = require("./str")

const matchChars = text => `translate(text()," ","")="${chars(text)}"`

const containsChars = text => `contains(translate(text()," ",""),"${chars(text)}")`

const containsClass = text => `contains(@class,"${text}")`

const selfTextContains = text => `//*[${containsChars(text)}]`

const prevSiblingTextIsStar = (text, num = 1) =>
  `//*[${matchChars(text)}]/following-sibling::*[${num}]`

const followingSiblingTextIsStar = (text, num = 1) =>
  `//*[${matchChars(text)}]/preceding-sibling::*[${num}]`

//// Methods for PDF viewer ////////

const prevSiblingTextContains = (text, num = 1) =>
  `//span[${containsChars(text)}]/following-sibling::span[${num}]`

const prevSiblingTextIs = (text, num = 1) =>
  `//span[${matchChars(text)}]/following-sibling::span[${num}]`

const followingSiblingTextIs = (text, num = 1) =>
  `//span[${matchChars(text)}]/preceding-sibling::span[${num}]`

module.exports = {
  matchChars,
  containsClass,
  containsChars,
  selfTextContains,
  prevSiblingTextIs,
  prevSiblingTextContains,
  prevSiblingTextIsStar,
  followingSiblingTextIs,
  followingSiblingTextIsStar,
}
