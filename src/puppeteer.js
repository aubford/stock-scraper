const { pause } = require("./util")

/**
 * @param page {MyPage}
 * @param selector {string}
 * @returns {Promise<string|string[]>}
 */
const getTextByX = async (page, selector) => {
  const elementArr = await page.$x(selector)
  if (!elementArr.length) {
    return ""
  }
  if (elementArr.length === 1) {
    return await elementArr[0].evaluate(({ textContent }) =>
      textContent ? textContent.trim() : ""
    )
  }
  return await Promise.all(
    elementArr.map(element =>
      element.evaluate(({ textContent }) => (textContent ? textContent.trim() : ""))
    )
  )
}

const waitForXpath = async (page, xpath, timeout) => {
  try {
    await page.waitForXPath(xpath, { timeout })
    return true
  } catch (err) {
    if (err.message.includes("is not a valid XPath expression")) {
      console.error("*** INVALID XPATH *** for xpath: " + xpath)
    } else {
      console.warn(`waitForXpath failed for xpath: ${xpath}`)
    }
    return false
  }
}

const wrapPage = page => {
  page.getTextByX = text =>
    getTextByX(page, text).catch(err => console.error("🚨 getTextByX: ", err))

  page.closeSafe = () => {
    const isOpen = page && !page.isClosed()

    if (isOpen) {
      return page.close().catch(err => {
        console.error("🚨 Page Close Error: ", err)
      })
    }
    console.error(
      `🚨 Page Close Error: ${page ? "Page exists but is closed" : "Page does not exist"}`
    )
    return Promise.resolve()
  }

  try {
    page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT)
  } catch (err) {
    console.error("🚨 setDefaultNavigationTimeout:" + err)
  }
}

/**
 * @param {MyPage} page
 * @param {array} searchArray
 * @param {function} callback
 * @returns {Promise<void>}
 */
const interceptRequests = async (page, callback) => {
  await page.setRequestInterception(true)
  page.on("request", req => {
    req.continue()
  })

  page.on("response", res => {
    callback(res, page)
  })
}

const responseInterceptorFuzzy = async (res, searchArr, callback) => {
  const url = res.url()
  const isMatch = searchArr.every(search => url.includes(search))
  if (isMatch) {
    const json = await res.json()
    await callback(json)
  }
}

const newPage = async browser => {
  /** @type {MyPage} */
  const page = await browser.newPage()
  wrapPage(page)
  return page
}

const goToPage = async (page, url, options = {}) => {
  try {
    await page.goto(url, options)
  } catch (error) {
    const msg = `🚨 PAGE LOAD ERROR -> ${error}`

    await page.closeSafe()
    await pause(60 * 1000)

    throw new Error(msg)
  }
}

/** @returns {Promise<MyPage>} */
const goToNewBrowserPage = async (browser, url, options = {}) => {
  const page = await newPage(browser, url)
  await goToPage(page, url, options)
  return page
}

/**
 * @param {Frame|Page} frame
 * @param selector {string}
 * @param {*} func
 * @returns {Promise<string|string[]>}
 */
const evalX = async (frame, selector, ...func) => {
  const elementArr = (await frame.$x(selector)) || []
  if (!elementArr.length) {
    return ""
  }
  if (elementArr.length === 1) {
    return await elementArr[0].evaluate(...func)
  }
  return await Promise.all(elementArr.map(element => element.evaluate(...func)))
}

/**
 * @param {Browser} browser
 * @param {String} url
 * @returns {Promise<*>}
 */
const getPageCookies = async (browser, url) => {
  const page = await goToNewBrowserPage(browser, url)
  const cookieArr = await page.cookies()
  await page.closeSafe()
  return cookieArr.map(({ name, value }) => `${name}=${value}`).join("; ")
}

module.exports = {
  getTextByX,
  waitForXpath,
  wrapPage,
  goToNewBrowserPage,
  newPage,
  goToPage,
  interceptRequests,
  responseInterceptorFuzzy,
  evalX,
  getPageCookies,
}
