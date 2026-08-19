/**
 * Copies VOO tickers to the clipboard for pasting into the Google Sheet.
 *
 * Run from the app prompt as `copyVooTickers`. Uses `getVooTickers()` (valid
 * symbols only, capped at the VOO fetch limit). Prompts for a count; blank
 * copies the full list. Tickers are newline-separated so pasting into one
 * sheet cell (⌘V, or ⌘⇧V for plain text) fills down.
 */
const { spawn } = require("child_process")
const { promptUser, getVooTickers } = require("../util")

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
  const answer = (await promptUser(`How many? (blank = all ${vooTickers.length}): `)).trim()
  const limit = answer === "" ? vooTickers.length : Number(answer)

  if (!Number.isInteger(limit) || limit < 1) {
    console.error(`Invalid count: "${answer}"`)
    return
  }

  const selected = vooTickers.slice(0, limit)
  await copyToClipboard(selected.join("\n"))

  console.log(`Copied ${selected.length} tickers to clipboard.`)
  console.log("Paste into a single cell in the Google Sheet with ⌘V (or ⌘⇧V for plain).")
}
