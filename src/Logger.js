// Error.prototype.setName = function (name) {
//   this.name = `[${name}]`
// }

class Logger {
  constructor(ticker, contextName, skipStartLog) {
    this.lineStart = `${ticker} - ${contextName}: `
    if (!skipStartLog) {
      this.log("Start")
    }
  }

  log(msg) {
    console.log(this.lineStart + `ℹ️ -> ${msg}`)
  }

  error(msg, err) {
    if (err) {
      console.error(this.lineStart + `🚨 -> ${msg}`, err)
    } else {
      console.error(this.lineStart + `🚨 -> ${msg}`)
    }
  }

  logError(err, funcName) {
    if (funcName && !err.nameLock) {
      err.name = `[${funcName}]`
    }
    console.error(this.lineStart + `🚨 ->`, err)
  }

  warn(msg, err) {
    if (err) {
      console.warn(this.lineStart + `⚠️ -> ${msg}`, err)
    } else {
      console.warn(this.lineStart + `⚠️ -> ${msg}`)
    }
  }

  warnError(err, funcName) {
    if (funcName && !err.nameLock) {
      err.name = `[${funcName}]`
    }
    console.warn(this.lineStart + `⚠️ ->`, err)
  }

  completeOk(msg = "Done") {
    console.log(this.lineStart + `✅ -> ${msg}`)
  }
}

module.exports = Logger
