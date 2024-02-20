const { goToNewBrowserPage } = require("../puppeteer-utils")
const { WarnError, ReError, MessageError } = require("../util")

const handlePage = async (page, { url, xPathArr, waitForPostScroll, timeout }) => {
  if (page.error) {
    throw new MessageError("goToNewBrowserPage returned truthy page.error", "fetchPdfData")
  }

  const dataNotAvailableText = await page.$x(
    `//body[contains(text(),'data is not available to create this report')]`
  )
  if (dataNotAvailableText.length > 0) {
    throw new WarnError(`Data not available text found in PDF`, "fetchPdfData")
  }

  await page.waitForXPath(xPathArr[0], { timeout }).catch(err => {
    throw new ReError(
      `waitForXpath timed out -> xpath: ${xPathArr[0]} <=> url: ${url}`,
      err,
      "handlePage"
    ).setCode(400)
  })

  if (waitForPostScroll) {
    const [viewerContainer] = await page.$x(`//div[@id='viewerContainer']`)
    await viewerContainer.evaluate(node => node.scrollBy(0, 2000))
    await page.waitForXPath(waitForPostScroll, { timeout }).catch(err => {
      throw new ReError(
        `waitForXpath after scroll timed out -> xpath: ${waitForPostScroll} <=> url: ${url}`,
        err,
        "handlePage"
      ).setCode(400)
    })
  }

  return await Promise.all(xPathArr.map(page.getTextByX))
}

/**
 * @param {object} options
 * @param {Browser}    options.browser
 * @param {string}    options.url
 * @param {string[]}  options.xPathArr
 * @param {string[]}  options.waitForPostScroll
 * @param {Number}    options.timeout
 * @returns {Promise<*[]>}
 */
const fetchPdfData = async ({
  browser,
  url,
  xPathArr,
  waitForPostScroll,
  timeout = XPATH_TIMEOUT,
}) => {
  if (!url) {
    throw new WarnError(`NO REPORT`, "fetchPdfData")
  }

  /** @type MyPage */
  const page = await goToNewBrowserPage(browser, url, {
    waitUntil: "networkidle2",
  }).catch(err => {
    throw new ReError("goToNewBrowserPage failed", err, "fetchPdfData").setCode(true)
  })

  const values = await handlePage(page, {
    url,
    xPathArr,
    waitForPostScroll,
    timeout,
  }).catch(err => {
    page.closeSafe()
    if (err.code) {
      throw err
    }
    throw new ReError("handlePage failed", err, "fetchPdfData").setCode(true)
  })

  await page.closeSafe()
  return values
}

module.exports = fetchPdfData
