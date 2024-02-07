require("../preload")
const { fetchHistoricalPrices, fetchVooIndexHistoricalPrices } = require("../src/sources/yahoo")
const moment = require("moment")
const { zip } = require("lodash")

// my birthday 2023 prices as test reference
const vooPriceOnMyBday = "417.33"
const applePriceOnMyBday = "192.75"

console.log("Running historical prices tests")

it("makes sure dates are correct", async () => {
  const { yahooDailyPrices: vooPrices, yahooDailyPricesDates: vooDates } =
    await fetchVooIndexHistoricalPrices(true)
  const { yahooDailyPrices, yahooDailyPricesDates } = await fetchHistoricalPrices("AAPL")

  // date arrays are exactly the same
  expect(yahooDailyPricesDates).toEqual(vooDates)

  // prices are same length as dates
  const acceptableLength = vooDates.length
  expect(vooPrices.length).toBe(acceptableLength)
  expect(yahooDailyPrices.length).toBe(acceptableLength)

  // all dates are before today
  expect(
    [...yahooDailyPricesDates, ...vooDates].every(date => {
      return moment(date, 'M/D/YYYY').isBefore(moment().startOf("day"))
    })
  )

  // prices match known historical price for date
  const vooZip = zip(vooDates, vooPrices)
  const appleZip = zip(yahooDailyPricesDates, yahooDailyPrices)

  expect(vooZip.find(([date]) => date === "7/24/2023")[1]).toBe(vooPriceOnMyBday)
  expect(appleZip.find(([date]) => date === "7/24/2023")[1]).toBe(applePriceOnMyBday)
})
