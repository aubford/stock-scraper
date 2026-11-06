const { goToNewBrowserPage } = require("../../util/puppeteer-utils")
const { MessageError } = require("../../util")

const CLOUDFLARE_WAIT_MS = 45_000

/**
 * @param {Error} err
 * @returns {boolean}
 */
const isTargetClosed = err =>
  /Target closed|Session closed|Protocol error/i.test(err?.message || "")

/**
 * Shared "warm one Chrome tab, then in-page fetch" helper. Used when a site
 * blocks bare Node `fetch` but allows `fetch` from a real browser context
 * after Cloudflare clears.
 *
 * Rewarm is blue-green: a new tab is opened and swapped in before the old one
 * closes, and the old tab is only closed after in-flight evaluates finish so
 * parallel tickers aren't killed mid-request.
 *
 * @param {{
 *   homeUrl: string,
 *   label: string,
 *   isBlocked: (status: number, html: string) => boolean,
 * }} options
 */
const createWarmBrowserFetch = ({ homeUrl, label, isBlocked }) => {
  /** @type {import('puppeteer-core').Page | null} */
  let warmPage = null
  /** @type {import('puppeteer-core').Browser | null} */
  let warmBrowser = null
  /** @type {Promise<import('puppeteer-core').Page> | null} */
  let warming = null
  /** @type {WeakMap<import('puppeteer-core').Page, number>} */
  const inFlightByPage = new WeakMap()
  /** @type {WeakSet<import('puppeteer-core').Page>} */
  const pendingClose = new WeakSet()
  /** @type {WeakSet<import('puppeteer-core').Page>} */
  const doomed = new WeakSet()

  /**
   * @param {import('puppeteer-core').Page} page
   * @returns {boolean} false if the page is already retiring/closed
   */
  const retain = page => {
    if (!page || page.isClosed() || doomed.has(page)) return false
    inFlightByPage.set(page, (inFlightByPage.get(page) || 0) + 1)
    return true
  }

  /**
   * @param {import('puppeteer-core').Page} page
   * @returns {Promise<void>}
   */
  const release = async page => {
    const next = (inFlightByPage.get(page) || 1) - 1
    if (next > 0) {
      inFlightByPage.set(page, next)
      return
    }
    inFlightByPage.delete(page)
    if (pendingClose.has(page)) await closePage(page)
  }

  /**
   * @param {import('puppeteer-core').Page} page
   * @returns {Promise<void>}
   */
  const closePage = async page => {
    if (!page || page.isClosed() || doomed.has(page)) return
    doomed.add(page)
    await page.closeSafe()
  }

  /**
   * Mark a replaced warm tab for close. If nothing is using it, close now;
   * otherwise close when the last in-flight evaluate releases.
   * @param {import('puppeteer-core').Page} page
   * @returns {Promise<void>}
   */
  const retirePage = async page => {
    if (!page || page.isClosed() || doomed.has(page)) return
    if ((inFlightByPage.get(page) || 0) > 0) {
      pendingClose.add(page)
      return
    }
    await closePage(page)
  }

  /**
   * @param {import('puppeteer-core').Page} page
   * @param {string} url
   * @returns {Promise<void>}
   */
  const waitOutCloudflare = async (page, url) => {
    await page
      .waitForFunction(() => !document.title.includes("Just a moment"), {
        timeout: CLOUDFLARE_WAIT_MS,
      })
      .catch(() => {
        throw new MessageError(
          `${label} Cloudflare challenge did not clear for ${url}`,
          `${label}.waitOutCloudflare`,
        )
      })
  }

  /**
   * @param {import('puppeteer-core').Browser} browser
   * @param {object} [logger]
   * @returns {Promise<import('puppeteer-core').Page>}
   */
  const createWarmPage = async (browser, logger) => {
    const page = await goToNewBrowserPage(browser, homeUrl, {
      waitUntil: "domcontentloaded",
      logger,
    })
    await waitOutCloudflare(page, homeUrl)
    const old = warmPage
    warmPage = page
    warmBrowser = browser
    if (old && old !== page) await retirePage(old)
    return page
  }

  /**
   * @param {import('puppeteer-core').Browser} browser
   * @param {object} [logger]
   * @returns {Promise<import('puppeteer-core').Page>}
   */
  const ensureWarmPage = async (browser, logger) => {
    if (warmPage && !warmPage.isClosed() && !doomed.has(warmPage) && warmBrowser === browser) {
      return warmPage
    }
    if (!warming) {
      warming = createWarmPage(browser, logger).finally(() => {
        warming = null
      })
    }
    return warming
  }

  /**
   * @param {import('puppeteer-core').Browser} browser
   * @param {object} [logger]
   * @returns {Promise<import('puppeteer-core').Page>}
   */
  const rewarmPage = async (browser, logger) => {
    if (warming) return warming
    warming = createWarmPage(browser, logger).finally(() => {
      warming = null
    })
    return warming
  }

  /**
   * Grab a warm page and retain it before any await gap that could retire it.
   * @param {import('puppeteer-core').Browser} browser
   * @param {object} [logger]
   * @returns {Promise<import('puppeteer-core').Page>}
   */
  const acquirePage = async (browser, logger) => {
    for (let i = 0; i < 5; i++) {
      const page = await ensureWarmPage(browser, logger)
      if (retain(page)) return page
    }
    throw new MessageError(
      `${label} could not acquire a warm browser tab`,
      `${label}.acquirePage`,
    )
  }

  /**
   * One CDP round-trip: run N `fetch` calls in parallel inside the tab.
   * Much faster than N concurrent `page.evaluate` calls, which contend on CDP.
   * @param {import('puppeteer-core').Page} page
   * @param {string[]} urls
   * @returns {Promise<Array<{url:string, status:number, html:string, blocked:boolean}>>}
   */
  const fetchHtmlsInPage = async (page, urls) => {
    const rows = await page.evaluate(async pageUrls => {
      return Promise.all(
        pageUrls.map(async url => {
          const res = await fetch(url, { credentials: "include" })
          const html = await res.text()
          return { url, status: res.status, html }
        }),
      )
    }, urls)
    return rows.map(row => ({ ...row, blocked: isBlocked(row.status, row.html) }))
  }

  /**
   * @param {Array<{url:string, status:number, html:string, blocked:boolean}>} results
   * @returns {void}
   */
  const assertResultsOk = results => {
    for (const result of results) {
      if (result.blocked) {
        throw new MessageError(
          `${label} fetch still blocked for ${result.url} (HTTP ${result.status})`,
          `${label}.fetchHtml`,
        )
      }
      if (result.status < 200 || result.status >= 300) {
        throw new MessageError(
          `${label} fetch failed: HTTP ${result.status} for ${result.url}`,
          `${label}.fetchHtml`,
        )
      }
    }
  }

  /**
   * @param {import('puppeteer-core').Browser} browser
   * @param {string[]} urls
   * @param {object} [logger]
   * @returns {Promise<string[]>} html aligned with `urls`
   */
  const fetchHtmlMany = async (browser, urls, logger) => {
    if (!urls.length) return []
    for (let attempt = 0; attempt < 2; attempt++) {
      let page
      try {
        page = await acquirePage(browser, logger)
        let results = await fetchHtmlsInPage(page, urls)
        if (results.some(r => r.blocked)) {
          const blockedUrl = results.find(r => r.blocked).url
          logger?.warn?.(`${label} blocked on ${blockedUrl}; re-warming`)
          await release(page)
          page = null
          page = await rewarmPage(browser, logger).then(async () =>
            acquirePage(browser, logger),
          )
          results = await fetchHtmlsInPage(page, urls)
        }
        assertResultsOk(results)
        // Preserve caller URL order (evaluate returns same order from Promise.all).
        return results.map(r => r.html)
      } catch (err) {
        if (attempt === 0 && isTargetClosed(err)) {
          logger?.warn?.(
            `${label} tab closed mid-fetch; retrying ${urls.length} url(s)`,
          )
          if (!warming) {
            warmPage = null
            warmBrowser = null
          }
          continue
        }
        throw err
      } finally {
        if (page) await release(page)
      }
    }
    throw new MessageError(
      `${label} fetch failed for ${urls.join(", ")}`,
      `${label}.fetchHtmlMany`,
    )
  }

  /**
   * @param {import('puppeteer-core').Browser} browser
   * @param {string} url
   * @param {object} [logger]
   * @returns {Promise<string>}
   */
  const fetchHtml = async (browser, url, logger) => {
    const [html] = await fetchHtmlMany(browser, [url], logger)
    return html
  }

  return { fetchHtml, fetchHtmlMany }
}

module.exports = { createWarmBrowserFetch, isTargetClosed }
