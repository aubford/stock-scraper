// Shared harness for debug/<source>.debug.js scripts:
//   node debug/boa.debug.js [TICKER]
// Optionally ensures the Chrome debug target (refreshing ws.json), opens login tabs only for the
// brokerages the source needs (waiting for Enter only if one is logged out), runs the fetch,
// prints the result, and exits non-zero on failure.
const util = require("util")
const { ensureDebugBrowser } = require("./debugBrowser")

/**
 * @typedef {{
 *   ticker: string,
 *   browser?: boolean,
 *   login?: ("Fidelity" | "Merrill")[],
 * }} DebugOptions
 *   ticker: default ticker, overridden by the first CLI arg
 *   browser: connect to the debug Chrome (implied by login)
 *   login: brokerages that must be signed in before fetching
 */

/**
 * @param {import('puppeteer-core').Browser} browser
 * @param {string[]} names
 * @returns {Promise<void>}
 */
const ensureLoggedIn = async (browser, names) => {
  const { promptLogin, promptUser } = require("./index")
  const { goToNewBrowserPage } = require("./puppeteer-utils")

  const { close, needsLogin } = await promptLogin(
    (url, options) => goToNewBrowserPage(browser, url, options),
    names
  )
  if (needsLogin) {
    await promptUser(`Press Enter after logging into ${names.join(" and ")}: `)
  }
  await close()
}

/**
 * @param {(ticker: string, browser?: import('puppeteer-core').Browser) => Promise<*>} fetch
 * @param {DebugOptions} options
 * @returns {Promise<number>} exit code
 */
const run = async (fetch, { ticker: defaultTicker, browser: needsBrowser, login = [] }) => {
  const ticker = (process.argv[2] || defaultTicker).toUpperCase()
  const useBrowser = needsBrowser || login.length > 0

  if (useBrowser) {
    await ensureDebugBrowser()
  }
  // globalEnv reads ws.json when loaded, so it must come after the browser is ready
  require("../../globalEnv")

  if (!useBrowser) {
    console.log(util.inspect(await fetch(ticker), { depth: null }))
    return 0
  }

  const puppeteer = require("puppeteer-core")
  const browser = await puppeteer.connect(CONNECTION)
  try {
    if (login.length) {
      await ensureLoggedIn(browser, login)
    }
    const res = await fetch(ticker, browser)
    console.log("success!!!")
    console.log(util.inspect(res, { depth: null }))
    return 0
  } finally {
    browser.disconnect()
  }
}

/**
 * Sources must be required inside `fetch` (not at the top of the debug script) so globalEnv
 * is loaded first.
 * @param {(ticker: string, browser?: import('puppeteer-core').Browser) => Promise<*>} fetch
 * @param {DebugOptions} options
 */
const runDebug = (fetch, options) =>
  run(fetch, options)
    .then(code => process.exit(code))
    .catch(err => {
      console.error(err)
      process.exit(1)
    })

module.exports = { runDebug }
