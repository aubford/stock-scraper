class Logger {
  /**
   * @param {string} ticker
   * @param {string} contextName
   */
  constructor(ticker, contextName) {
    this.lineStart = contextName ? `${ticker} - ${contextName}: ` : `${ticker} - `
  }

  start() {
    this.log("⭐ Start")
  }

  /**
   * simple log
   * @param {string} msg
   */
  log(msg) {
    console.log(this.lineStart + `ℹ️ -> ${msg}`)
  }

  /**
   * log an error message and tack on an Error if it exists
   * @param {string} msg
   * @param {Error} [err]
   */
  error(msg, err) {
    if (err) {
      console.error(this.lineStart + `🚨 -> ${msg}`, err)
    } else {
      console.error(this.lineStart + `🚨 -> ${msg}`)
    }
  }

  /**
   * log an error without a message
   * @param err
   */
  logError(err) {
    console.error(this.lineStart + `🚨 ->`, err)
  }

  /**
   * log a warning message and tack on an error if it exists; remove error stack for conciseness
   * @param {string} msg
   * @param {Error} [err]
   */
  warn(msg, err) {
    if (err) {
      const clone = { ...err, stack: "" }
      console.warn(this.lineStart + `⚠️ -> ${msg}`, clone)
    } else {
      console.warn(this.lineStart + `⚠️ -> ${msg}`)
    }
  }

  /**
   * log an error as a warning; remove error stack for conciseness
   * @param {Error} err
   */
  warnError(err) {
    const clone = { ...err, stack: "" }
    console.warn(this.lineStart + `⚠️ ->`, clone)
  }

  completeOk(msg = "Done") {
    console.log(this.lineStart + `✅ -> ${msg}`)
  }
}

module.exports = Logger
