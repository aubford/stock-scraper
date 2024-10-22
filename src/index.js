require("../globalEnv")
const { promptUser } = require("./util")
const fs = require("fs")
const path = require("path")

function getAppFileNames() {
  const appsDir = path.join(__dirname, "apps")

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
  if (res === "exit") {
    return
  }

  if (res === "help") {
    console.log("Available apps:\n")
    console.log(getAppFileNames(), "\n")
  } else {
    const app = require(`./apps/${res}`)
    await app()
  }

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
