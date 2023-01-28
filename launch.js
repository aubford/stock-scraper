const { spawn, exec } = require("child_process")

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

  const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
    "--remote-debugging-port=9222",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-features=IsolateOrigins",
    "--site-per-process",
  ])
  chrome.stdout.on("data", data => {
    console.log(`chrome stdout: ${data}`)
  })
  chrome.stderr.on("data", err => {
    console.log(`chrome stderr: ${err}`)
  })
  chrome.on("close", code => {
    console.log(`chrome process exited with code ${code}`)
  })

  const waitOn = spawn("wait-on", ["http://localhost:9222"])
  waitOn.stdout.on("data", data => {
    console.log(`wait-on stdout: ${data}`)
  })
  waitOn.stderr.on("data", err => {
    console.error(`wait-on stderr: ${err}`)
  })
  waitOn.on("close", code => {
    console.log(`wait-on process exited with code ${code}`)
    exec("curl http://localhost:9222/json/version > ws.json", (err, stdout, stderr) => {
      if (err) {
        console.error(`exec error: ${err}`)
        return
      }
      console.log(`curl stdout: ${stdout}`)
      console.log(`curl stderr: ${stderr}`)
    })
  })
})
