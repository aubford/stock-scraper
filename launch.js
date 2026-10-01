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
    chrome = launchChrome()
  } catch (err) {
    console.error(err.message)
    process.exitCode = 1
    return
  }
  chrome.stdout.on("data", data => {
    console.log(`chrome stdout: ${data}`)
  })
  chrome.stderr.on("data", err => {
    console.log(`chrome stderr: ${err}`)
  })
  chrome.on("close", code => {
    console.log(`chrome process exited with code ${code}`)
  })

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
