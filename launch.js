const puppeteer = require("puppeteer")

function pbcopy(data) {
  const proc = require("child_process").spawn("pbcopy")
  proc.stdin.write(data)
  proc.stdin.end()
}

function main() {
  puppeteer
    .launch({
      headless: false,
      product: "firefox",
      defaultViewport: {
        width: 1400,
        height: 1800
      }
    })
    .then(async browser => {
      const wsEndpoint = browser.wsEndpoint()
      pbcopy(wsEndpoint)
      console.log(wsEndpoint)
    })
}

main()
