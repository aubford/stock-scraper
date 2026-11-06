const { pause, ReError, MessageError, begin, promptLogin, promptUser } = require("./index")
const { ensureDebugBrowser } = require("./debugBrowser")
const puppeteer = require("puppeteer-core")

/**
 * Reuse (or launch) the debug Chrome, connect, and run the app.
 * @template T
 * @param {(browser: import('puppeteer-core').Browser) => Promise<T>} app
 * @returns {Promise<T | void>}
 */
const connectAndRunApp = app =>
  ensureDebugBrowser()
    .then(({ version }) =>
      puppeteer.connect({ ...CONNECTION, browserWSEndpoint: version.webSocketDebuggerUrl })
    )
    .then(browser =>
      app(browser).then(result => {
        browser.disconnect()
        return result
      })
    )
    .catch(err => console.error(err))

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

/** @type {WeakMap<import('puppeteer-core').Browser, import('puppeteer-core').CDPSession>} */
const browserCdpSessions = new WeakMap()

/**
 * Long-lived browser CDP session. Creating + detaching a session on the browser
 * target each time breaks puppeteer's "browser" target tracking ("Browser target
 * is not found" on later newPage calls).
 * @param {import('puppeteer-core').Browser} browser
 * @returns {Promise<import('puppeteer-core').CDPSession>}
 */
const getBrowserCdpSession = async browser => {
  const existing = browserCdpSessions.get(browser)
  if (existing) return existing
  const session = await browser.target().createCDPSession()
  browserCdpSessions.set(browser, session)
  return session
}

/**
 * Open a tab via CDP. Defaults to `background: true` so macOS focus isn't
 * stolen. Pass `{ background: false }` for pages that must be active (PDF
 * viewer extension only renders a text layer in a foreground tab).
 * @param {import('puppeteer-core').Browser} browser
 * @param {{ background?: boolean }} [options]
 * @returns {Promise<MyPage>}
 */
const newPage = async (browser, { background = true } = {}) => {
  try {
    const session = await getBrowserCdpSession(browser)
    const { targetId } = await session.send("Target.createTarget", {
      url: "about:blank",
      background,
    })
    const target = await browser.waitForTarget(t => t._targetId === targetId)
    const page = await target.page()
    if (!page) {
      throw new MessageError(`Failed to open page for target ${targetId}`, "newPage")
    }
    wrapPage(page)
    if (!background) {
      await page.bringToFront().catch(() => {})
    }
    return /** @type {MyPage} */ page
  } catch (err) {
    // Fall back if the browser target/session is unhealthy; steals focus but works.
    browserCdpSessions.delete(browser)
    const page = await browser.newPage()
    wrapPage(page)
    return /** @type {MyPage} */ page
  }
}

/**
 *
 * @param {MyPage} page
 * @param {string} url
 * @param {Object} options
 * @returns {Promise<void>}
 */
const goToPage = async (page, url, options = {}) => {
  try {
    await page.goto(url, options)
  } catch (error) {
    const clone = { ...error }

    await page.closeSafe()
    await pause(5 * 1000)

    throw new ReError("PAGE LOAD ERROR", clone, `goToPage: ${url}`)
  }
}

/**
 * @param {import('puppeteer-core').Browser} browser
 * @param {string} url
 * @param {Object} [options] puppeteer goto options, plus:
 * @param {boolean} [options.foreground] open an active tab (needed for PDF viewer)
 * @returns {Promise<MyPage>}
 */
const goToNewBrowserPage = async (browser, url, options = {}) => {
  const { foreground = false, ...gotoOptions } = options
  const page = await newPage(browser, { background: !foreground })
  await goToPage(page, url, gotoOptions)
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
  const page = await goToNewBrowserPage(browser, url).catch(async err => {
    await page.closeSafe()
    throw new ReError("goToNewBrowserPage failed", err, "getPageCookies")
  })

  const cookieArr = await page.cookies()
  await page.closeSafe()
  return cookieArr.map(({ name, value }) => `${name}=${value}`).join("; ")
}

/**
 * Open login tabs for the given brokerages and wait for Enter only if one is logged out.
 * @param {Browser} browser
 * @param {("Fidelity" | "Merrill")[]} names
 * @returns {Promise<void>}
 */
const ensureLoggedIn = async (browser, names) => {
  const { close, needsLogin } = await promptLogin(
    (url, options) => goToNewBrowserPage(browser, url, options),
    names
  )
  if (needsLogin) {
    await promptUser(`Press Enter after logging into ${names.join(" and ")}: `)
  }
  await close()
}

/**
 * @param {Browser} browser
 * @param {("Fidelity" | "Merrill")[]} names - brokerages the app scrapes through
 * @returns {Promise<void>}
 */
const beginAndLogin = async (browser, names) => {
  begin()
  await ensureLoggedIn(browser, names)
}

module.exports = {
  getTextByX,
  wrapPage,
  goToNewBrowserPage,
  newPage,
  goToPage,
  evalX,
  getPageCookies,
  ensureLoggedIn,
  beginAndLogin,
  connectAndRunApp,
}
