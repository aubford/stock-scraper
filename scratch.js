const _ = require("lodash")

const collection = [
  ["a", 453],
  ["b", 453],
  ["a", 458],
  ["c", 453]
]

const keyBy = _.fromPairs(collection) /* ?*/
