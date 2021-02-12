const puppeteer = require("puppeteer")
const fs = require("fs")

const connection = {
  headless: false,
  product: "firefox",
  defaultViewport: {
    width: 1400,
    height: 1800
  }
}

function pbcopy(data) {
  const proc = require("child_process").spawn("pbcopy")
  proc.stdin.write(data)
  proc.stdin.end()
}

puppeteer.launch(connection).then(async browser => {
  const browserWSEndpoint = browser.wsEndpoint()
  console.log(browserWSEndpoint)

  fs.writeFile("browserWSEndpoint.json", JSON.stringify({ browserWSEndpoint }), err =>
    console.log(err)
  )
})
