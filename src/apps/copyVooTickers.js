const { spawn } = require("child_process")
const { promptUser, getVooTickers } = require("../util")

const VALID_TICKER = /^[A-Z]+(\.[A-Z]+)?$/

const vooTickers = getVooTickers()

const copyToClipboard = text =>
  new Promise((resolve, reject) => {
    const pbcopy = spawn("pbcopy")
    pbcopy.on("error", reject)
    pbcopy.on("close", code =>
      code === 0 ? resolve() : reject(new Error(`pbcopy exited ${code}`)),
    )
    pbcopy.stdin.end(text)
  })

module.exports = async () => {
  const valid = vooTickers.filter(t => VALID_TICKER.test(t))
  const skipped = vooTickers.filter(t => !VALID_TICKER.test(t))

  const answer = (await promptUser(`How many? (blank = all ${valid.length}): `)).trim()
  const limit = answer === "" ? valid.length : Number(answer)

  if (!Number.isInteger(limit) || limit < 1) {
    console.error(`Invalid count: "${answer}"`)
    return
  }

  const selected = valid.slice(0, limit)
  await copyToClipboard(selected.join("\n"))

  console.log(`Copied ${selected.length} tickers to clipboard.`)
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} non-ticker entries: ${skipped.join(", ")}`)
  }
  console.log("Paste into a single cell in the Google Sheet with ⌘V (or ⌘⇧V for plain).")
}
