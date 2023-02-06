class Logger {
  constructor(ticker, contextName) {
    this.lineStart = `${ticker} - ${contextName}: `
    this.log("Start")
  }

  log(msg) {
    console.log(this.lineStart + `ℹ️ -> ${msg}`)
  }

  error(msg) {
    console.error(this.lineStart + `🚨 -> ${msg}`)
  }

  warn(msg) {
    console.warn(this.lineStart + `⚠️ -> ${msg}`)
  }

  completeOk(msg) {
    console.log(this.lineStart + `✅ -> ${msg}`)
  }
}

module.exports = Logger
