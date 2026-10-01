// Manages the Chrome remote-debugging target that puppeteer connects to.
// Intentionally dependency-free (node built-ins only) so it runs before/without node_modules.
const { spawn } = require("child_process")
const fs = require("fs")
const http = require("http")
const os = require("os")
const path = require("path")

const DEBUG_PORT = 9222
// 127.0.0.1 rather than localhost: Chrome only listens on IPv4 loopback
const VERSION_URL = `http://127.0.0.1:${DEBUG_PORT}/json/version`
const WS_JSON_LOCATION = path.resolve(__dirname, "../../ws.json")
const CHROME_PATH =
  process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
const USER_DATA_DIR = path.join(os.homedir(), "chrome-debug-profile")
const CHROME_ARGS = [
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${USER_DATA_DIR}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-features=IsolateOrigins",
  "--site-per-process",
]

const DEFAULT_WAIT_TIMEOUT_MS = 60 * 1000
const POLL_INTERVAL_MS = 500
const REQUEST_TIMEOUT_MS = 2000

/**
 * @typedef {{ webSocketDebuggerUrl: string, Browser?: string }} DebugTargetVersion
 */

/**
 * GET /json/version from the debug target.
 * @returns {Promise<DebugTargetVersion>} rejects if nothing is listening yet
 */
const getDebugTargetVersion = () =>
  new Promise((resolve, reject) => {
    const req = http.get(VERSION_URL, res => {
      let body = ""
      res.setEncoding("utf8")
      res.on("data", chunk => (body += chunk))
      res.on("end", () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} from ${VERSION_URL}`))
        }
        try {
          const version = JSON.parse(body)
          if (!version.webSocketDebuggerUrl) {
            return reject(new Error(`No webSocketDebuggerUrl in response from ${VERSION_URL}`))
          }
          resolve(version)
        } catch (err) {
          reject(err)
        }
      })
    })
    req.on("error", reject)
    req.setTimeout(REQUEST_TIMEOUT_MS, () =>
      req.destroy(new Error(`Timed out after ${REQUEST_TIMEOUT_MS}ms: ${VERSION_URL}`))
    )
  })

/**
 * Persist the debug target info where globalEnv.js expects it.
 * @param {DebugTargetVersion} version
 * @returns {string} location written
 */
const writeWsJson = version => {
  fs.writeFileSync(WS_JSON_LOCATION, JSON.stringify(version, null, 2) + "\n")
  return WS_JSON_LOCATION
}

/**
 * Spawn Chrome with the remote-debugging profile.
 * @param {{ detached?: boolean }} [options] detached lets Chrome outlive the launching process
 * @returns {import('child_process').ChildProcess}
 */
const launchChrome = ({ detached = false } = {}) => {
  if (!fs.existsSync(CHROME_PATH)) {
    throw new Error(
      `Google Chrome not found at "${CHROME_PATH}". ` +
        "Install Chrome or set CHROME_PATH to the browser binary."
    )
  }

  const chrome = spawn(
    CHROME_PATH,
    CHROME_ARGS,
    detached ? { detached: true, stdio: "ignore" } : {}
  )
  if (detached) {
    chrome.unref()
  }
  return chrome
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Poll /json/version until the debug target answers.
 * @param {{ chrome?: import('child_process').ChildProcess, timeoutMs?: number }} [options]
 *   chrome: when given, an early exit of the process fails the wait immediately
 * @returns {Promise<DebugTargetVersion>}
 */
const waitForDebugTarget = async ({ chrome, timeoutMs = DEFAULT_WAIT_TIMEOUT_MS } = {}) => {
  let exitCode = null
  let spawnError = null
  if (chrome) {
    chrome.once("exit", code => (exitCode = code))
    chrome.once("error", err => (spawnError = err))
  }

  const deadline = Date.now() + timeoutMs
  let lastError = null
  while (Date.now() < deadline) {
    if (spawnError) {
      throw new Error(`Failed to start Chrome: ${spawnError.message}`)
    }
    if (exitCode !== null) {
      throw new Error(
        `Chrome exited (code ${exitCode}) before the debug target came up. ` +
          `Another Chrome may already be using ${USER_DATA_DIR}; ` +
          'run "npm run launch" to restart it.'
      )
    }
    try {
      return await getDebugTargetVersion()
    } catch (err) {
      lastError = err
    }
    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(
    `Chrome debug target did not respond within ${timeoutMs}ms` +
      (lastError ? ` (last error: ${lastError.message})` : "")
  )
}

/**
 * Make sure a debug Chrome is up and ws.json points at it: reuse the running
 * target if there is one, otherwise launch a detached Chrome and wait for it.
 * @param {{ log?: function(string): void, timeoutMs?: number }} [options]
 * @returns {Promise<{ version: DebugTargetVersion, launched: boolean }>}
 */
const ensureDebugBrowser = async ({ log = console.log, timeoutMs } = {}) => {
  const existing = await getDebugTargetVersion().catch(() => null)
  if (existing) {
    writeWsJson(existing)
    log(`Reusing Chrome debug target: ${existing.webSocketDebuggerUrl}`)
    return { version: existing, launched: false }
  }

  log(`No Chrome debug target on port ${DEBUG_PORT}, launching Chrome...`)
  const chrome = launchChrome({ detached: true })
  const version = await waitForDebugTarget({ chrome, timeoutMs })
  writeWsJson(version)
  log(`Chrome debug target ready: ${version.webSocketDebuggerUrl}`)
  return { version, launched: true }
}

module.exports = {
  DEBUG_PORT,
  CHROME_PATH,
  USER_DATA_DIR,
  WS_JSON_LOCATION,
  getDebugTargetVersion,
  writeWsJson,
  launchChrome,
  waitForDebugTarget,
  ensureDebugBrowser,
}

if (require.main === module) {
  ensureDebugBrowser()
    .then(() => {
      console.log(`Wrote ${WS_JSON_LOCATION}`)
      process.exit(0)
    })
    .catch(err => {
      console.error(err.message)
      process.exit(1)
    })
}
