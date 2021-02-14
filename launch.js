const puppeteer = require("puppeteer")
const fs = require("fs")

const connection = {
  headless: false,
  product: "firefox",
  defaultViewport: {
    width: 1280,
    height: 1304
  }
}

puppeteer.launch(connection).then(async browser => {
  const browserWSEndpoint = browser.wsEndpoint()
  console.log(browserWSEndpoint)

  fs.writeFile("browserWSEndpoint.json", JSON.stringify({ browserWSEndpoint }), err =>
    console.log(err)
  )
})
