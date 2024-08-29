const {
  writeOut,
  readJsonFile,
  promptForYes,
  writeJsonFile,
  getStockTickers,
} = require("../util")

const app = async () => {
  const isVoo = await promptForYes("Is VOO?")
  if (isVoo) {
    return writeJsonFile(VOO_LOCATION, {})
  }

  const fullReset = await promptForYes("Full reset?")
  writeJsonFile(
    STOCK_DATA_LOCATION,
    fullReset
      ? {}
      : getStockTickers().reduce(
          (acc, ticker) => ({
            [ticker]: { ticker },
            ...acc,
          }),
          {}
        )
  )
}

module.exports = async () =>
  app()
    .then(() => {
      console.log("✨ Data wiped ✨")
    })
    .catch(err => console.error("Error:", err))
