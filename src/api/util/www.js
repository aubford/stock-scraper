const { goToNewBrowserPage } = require("../../puppeteer")
const Logger = require("../../Logger")
const { ReError, MessageError } = require("../../util")

/**
 * @returns {Promise<string>}
 */
const fetchText = async (...fetchArgs) => {
  const response = await fetch(/**@type * */ ...fetchArgs)
  return await response.text()
}

/**
 * @returns {Promise<string>}
 */
const fetchJson = async (...fetchArgs) => {
  const response = await fetch(/**@type * */ ...fetchArgs)
  return response.json()
}

const getFidelitySecretUrl = async (fidelityLink, browser, ticker) => {
  const logger = new Logger(ticker, "getFidelitySecretUrl")
  if (!fidelityLink) {
    throw new MessageError("No fidelityLink provided")
  }

  const page = await goToNewBrowserPage(browser, fidelityLink, { logger }).catch(err => {
    throw new ReError("goToNewBrowserPage failed", err, "getFidelitySecretUrl")
  })

  try {
    const src = await page.$eval("frame", node => node.getAttribute("src"))
    logger.completeOk("getFidelitySecretUrl: Done")
    return `https://research2.fidelity.com/cgi-bin/upload.dll/${src}`
  } catch (err) {
    throw new ReError("failed to find secret URL on page", err)
  } finally {
    await page.closeSafe()
  }
}

const handleFetch = (fetchCallback, ticker, contextName) => {
  const logger = new Logger(ticker, contextName)
  return fetchCallback(logger)
    .catch(error => {
      if (error.code === 404) {
        logger.warnError(error)
        return {}
      }
      logger.error("fetch error!", error)
      return { error }
    })
    .then(res => {
      logger.completeOk()
      return res
    })
}

module.exports = {
  fetchText,
  fetchJson,
  getFidelitySecretUrl,
  handleFetch,
}
