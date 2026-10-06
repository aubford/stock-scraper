// Force-restarts Chrome as a remote-debugging target and writes ws.json.
// For reuse-or-launch (no kill), see src/util/debugBrowser.js / `npm run quick`.
const { exec } = require("child_process")
const { launchChrome, waitForDebugTarget, writeWsJson } = require("./src/util/debugBrowser")

const log = (err, stdout, stderr) => {
  if (err) {
    console.error(`exec error: ${err}`)
    return
  }
  if (stdout) {
    console.log(`stdout: ${stdout}`)
  }

  if (stderr) {
    console.log(`stderr: ${stderr}`)
  }
}

exec("killall Google\\ Chrome; ", (...args) => {
  log(...args)

  let chrome
  try {
    // detached: Chrome must outlive this terminal (Ctrl-C / closing it would drop brokerage sessions)
    chrome = launchChrome({ detached: true })
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
    return
  }

  waitForDebugTarget({ chrome })
    .then(version => {
      const location = writeWsJson(version)
      console.log(`Debug target ready: ${version.webSocketDebuggerUrl}`)
      console.log(`Wrote ${location}`)
    })
    .catch(err => {
      console.error(err.message)
      process.exitCode = 1
    })
})
