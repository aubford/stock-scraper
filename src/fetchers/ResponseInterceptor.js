const { getHtmlOrJson, WarnError, ReError, MessageError } = require("../util")

class ResponseInterceptor {
  constructor(logger, searchArr, exact, { expectString, negativeSearchArr = [] } = {}) {
    this.data = []
    this.logger = logger
    this.searchArr = searchArr
    this.exact = exact
    this.asyncErr = null
    this.expectString = expectString
    this.responses = []
    this.negativeSearchArr = negativeSearchArr
  }

  handleInterception(response) {
    this.processResponse(response).catch(err => {
      if (err instanceof WarnError) {
        return
      }

      this.setAsyncErr("error for search: " + this.searchArr.join(", "), err)
    })
  }

  async processResponse(res) {
    const url = res.url()
    const isMatch = this.exact
      ? this.searchArr.some(search => url === search)
      : this.searchArr.some(search => url.includes(search))

    if (!isMatch) return

    // When the caller wants HTML, skip JSON sub-requests that happen to share a URL substring.
    // This avoids reading bodies we don't care about (which can fail noisily during teardown).
    const contentType = res.headers()["content-type"] || ""
    if (this.expectString && !contentType.includes("html")) {
      return
    }

    const htmlOrJson = await getHtmlOrJson(res)
    if (this.expectString) {
      if (typeof htmlOrJson === "string") {
        this.data.push(htmlOrJson)
        this.responses.push(res)
      }
    } else {
      this.data.push(htmlOrJson)
      this.responses.push(res)
    }
  }

  /**
   * Set async error if not already set so we can respond to the first error that occurs like a synchronous flow
   * @param {string} msg
   * @param {ReError | MessageError | WarnError} err
   */
  setAsyncErr(msg, err) {
    this.logger.logError(new ReError(msg, err, "ResponseInterceptor (setAsyncErr log)"))
    if (!this.asyncErr) {
      this.asyncErr = new ReError(msg, err, "ResponseInterceptor")
    }
  }

  someDataDiffer() {
    const first = JSON.stringify(this.data[0])
    return this.data.some(data => JSON.stringify(data) !== first)
  }

  getData() {
    if (this.data.length > 1 && this.someDataDiffer()) {
      //  There should only be one interception per search and the chronology should be predictable."
      throw new ReError(
        "Multiple interceptions occurred, this is not expected.",
        { data: this.data },
        "ResponseInterceptor"
      )
    }
    return this.data.pop()
  }

  /**
   * get the single result you are looking for; dont forget to add a catch for errors
   * @param checkInterval
   * @param timeout
   * @returns {Promise<unknown>}
   */
  waitForResult(checkInterval = 200, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const intervalId = setInterval(() => {
        if (this.asyncErr) {
          clearInterval(intervalId)
          reject(this.asyncErr)
          return
        }

        try {
          const data = this.getData()
          if (data) {
            clearInterval(intervalId)
            resolve(data)
            return
          }
        } catch (err) {
          clearInterval(intervalId)
          reject(err)
          return
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(intervalId)
          reject(
            new MessageError(
              `Timeout waiting for condition to become truthy: ${this.searchArr.join(", ")}`,
              "ResponseInterceptor"
            )
          )
        }
      }, checkInterval)
    })
  }
}

module.exports = ResponseInterceptor
