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

module.exports = {
  fetchText,
  fetchJson,
  getFidelitySecretUrl,
}
