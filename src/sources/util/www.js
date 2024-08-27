const { goToNewBrowserPage } = require("../../util/puppeteer-utils")
const Logger = require("../../util/Logger")
const { ReError, MessageError, formatErrorObject, WarnError } = require("../../util")
const { snakeCase } = require("lodash")

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
  return await response.json()
}

const getFidelitySecretUrl = async (fidelityLink, browser, ticker) => {
  const logger = new Logger(ticker, "getFidelitySecretUrl")
  logger.start()
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

/**
 * Wrapper for all the sources fetch calls.
 * @param {function(Logger, string): Promise<Object>} fetchCallback - The callback function to fetch data.
 * @param {string} ticker - The stock ticker symbol.
 * @param {string} contextName - The context name for logging.
 * @returns {Promise<Object>} - A promise that resolves with the fetched data or an error object.
 */
const handleFetch = (fetchCallback, ticker, contextName) => {
  const logger = new Logger(ticker, contextName)
  logger.start()
  return fetchCallback(logger, ticker)
    .then(res => {
      logger.completeOk()
      return res
    })
    .catch(error => {
      if (error instanceof WarnError) {
        logger.warnError(error)
        return { ["warnError_" + snakeCase(contextName)]: error }
      }
      logger.error("Fetch Aborted", error)
      const errorObject = formatErrorObject(error)
      return {
        ...errorObject,
        ["error_" + snakeCase(contextName)]: errorObject.error,
      }
    })
}

module.exports = {
  fetchText,
  fetchJson,
  getFidelitySecretUrl,
  handleFetch,
}
