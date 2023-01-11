const { newBrowserPage } = require("../../puppeteer")
const Logger = require("../../Logger")

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
  const logger = new Logger(ticker, "Fidelity Secret URL")
  if (!fidelityLink) {
    return null
  }
  const page = await newBrowserPage(browser, fidelityLink, { logger })
  try {
    const src = await page.$eval("frame", node => node.getAttribute("src"))
    logger.completeOk("getFidelitySecretUrl: Done")
    return `https://research2.fidelity.com/cgi-bin/upload.dll/${src}`
  } catch (err) {
    logger.error("failed to getFidelitySecretUrl")
    return null
  } finally {
    await page.closeSafe()
  }
}

module.exports = {
  fetchText,
  fetchJson,
  getFidelitySecretUrl,
}
