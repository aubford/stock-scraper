class Logger {
  constructor(ticker, analystName) {
    this.lineStart = `${ticker} - ${analystName}: `
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
