const data = require("./testOutput.json")
const _ = require("lodash")

const ONE = "one"
const THREE = "three"

const a = {
  "one": 1,
  "two": 2
}

const {
  [ONE]: resA,
  [THREE]: resB
} = a

resA;
resB;


const sua = [{a:1,b:2},{a:3,b:4}]

_.map(sua,"a") /* ?+*/
