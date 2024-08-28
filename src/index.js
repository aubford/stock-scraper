const { promptUser } = require("./util")
require("../globalEnv")

try {
  const { webSocketDebuggerUrl } = require("../ws.json")
  global.CONNECTION = {
    browserWSEndpoint: webSocketDebuggerUrl,
    defaultViewport: {
      width: 1400,
      height: 1800,
    },
  }
} catch (err) {
  console.log("skipped ws connection")
}

// Error.stackTraceLimit = 1

const timeoutCoeff = 2

global.PAUSE_MS = 1000 * timeoutCoeff
global.DEFAULT_NAVIGATION_TIMEOUT = 60 * 1000 * timeoutCoeff
global.XPATH_TIMEOUT = 30 * 1000 * timeoutCoeff

global.WSJ_TIMEOUT = 10 * 1000 * timeoutCoeff
global.FIDELITY_ANALYST_TIMEOUT = 25 * 1000 * timeoutCoeff
global.MOODYS_TIMEOUT = 20 * 1000 * timeoutCoeff
global.CFRA_TIMEOUT = 20 * 1000 * timeoutCoeff
global.BOA_TIMEOUT = 10 * 1000 * timeoutCoeff
global.ARGUS_ANALYST_TIMEOUT = 10 * 1000 * timeoutCoeff
global.MORNINGSTAR_TIMEOUT = 20 * 1000 * timeoutCoeff

global.SCRAPBOOK_LOCATION = process.env.STOCK_SCRAPBOOK_LOCATION
global.STOCK_DATA_LOCATION = `${SCRAPBOOK_LOCATION}/stockData.json`
global.STOCK_DATA_STAGING = `${__dirname}/../stockDataStaging.json`
global.VOO_DATA_STAGING = `${__dirname}/../vooDataStaging.json`
global.VOO_LOCATION = `${SCRAPBOOK_LOCATION}/vooData.json`
global.META_LOCATION = `${SCRAPBOOK_LOCATION}/stockDataMeta.json`

Promise.stagger = async (asyncFunc, paramArr, ms) => {
  const staggered = paramArr.map(async (params, idx) => {
    await new Promise(resolve => setTimeout(resolve, idx * ms))
    const normalized = [].concat(params)
    return asyncFunc(...normalized)
  })
  return await Promise.all(staggered)
}

const fs = require("fs")
const path = require("path")

function getAppFileNames() {
  const appsDir = path.join(__dirname, "src", "apps")

  try {
    const files = fs.readdirSync(appsDir)
    return files
      .filter(file => path.extname(file) === ".js")
      .map(file => path.basename(file, ".js"))
      .join("\n")
  } catch (err) {
    console.error("Error reading directory:", err)
    return ""
  }
}

const run = async () => {
  const res = await promptUser("App: ")
  if (res === "help") {
    console.log("Here are the available apps:")
    console.log("Main apps: ", getAppFileNames())
    console.log("Other apps: csv, csvCheckForMissing, addTickers, pruneTickers, showTickers")
  }

  let app
  if (res === "csv") {
    app = require("./csv/processCSVs.js")
  } else if (["addTickers", "pruneTickers", "showTickers"].includes(res)) {
    app = require(`./database/${res}`)
  } else {
    app = require(`./apps/${res}`)
  }

  await app()
  await run()
}

run()
  .then(() => {
    console.log("Exiting...")
    process.exit(0)
  })
  .catch(err => {
    console.error("Error:", err)
    process.exit(1)
  })
