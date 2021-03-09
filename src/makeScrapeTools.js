const { newBrowserPage, evalX } = require("./util")

module.exports = (ticker, browser) => {
  const newPage = (url, options) => newBrowserPage(browser, url, options)

  return {
    async fetchFidelityPageData(fidelityPage, fidelityReportNameArr) {
      if (fidelityPage) {
        /** @type {array} */
        const reportHrefsHandles = await fidelityPage.$x(
          `//table[@id="allOpinionsTable"]/tbody/tr/td[9]`
        )

        const reportLinks = await Promise.all(
          reportHrefsHandles.map(handle =>
            evalX(handle, "a", node => {
              const href = node.href
              const text = node.textContent

              if (href === "javascript:void(0);") {
                return { text, href: node.getAttribute("onclick").split(`'`)[1] }
              }

              return { text, href }
            })
          )
        )

        if (fidelityPage) {
          await fidelityPage.closeSafe()
        }
        return _.fromPairs(_.zip(fidelityReportNameArr, reportLinks))
      }
      return {}
    },

    async fetchPdfData({
      url,
      xPathArr,
      screenShotArr,
      waitForPostScroll,
      analystName,
      timeout = XPATH_TIMEOUT,
    }) {
      if (!url) {
        console.log(`no report -> ticker: ${ticker} -> analyst:${analystName}`)
        return []
      }

      /** @type MyPage */
      const page = await newPage(url)
      if (page.error) {
        await page.closeSafe()
        return []
      }

      /** @type ElementHandle[] */
      const dataNotAvailableText = await page.$x(
        `//body[contains(text(),'data is not available to create this report')]`
      )
      if (dataNotAvailableText.length > 0) {
        await page.closeSafe()
        return []
      }

      try {
        await page.waitForXPath(xPathArr[0], { timeout })
      } catch (err) {
        console.log(
          `waitForXpath failed -> ticker: ${ticker} -> analyst:${analystName} -> url: ${url}`
        )
        await page.closeSafe()
        return []
      }

      if (screenShotArr) {
        await Promise.all(
          screenShotArr.map(clip =>
            page.screenshot({
              clip,
              path: `${SCRAPBOOK_LOCATION}/${ticker}-${analystName}-screenshot.png`,
            })
          )
        )
      }

      if (waitForPostScroll) {
        const [viewerContainer] = await page.$x(`//div[@id='viewerContainer']`)
        await viewerContainer.evaluate(node => node.scrollBy(0, 2000))
        try {
          await page.waitForXPath(waitForPostScroll, { timeout: XPATH_TIMEOUT })
        } catch (err) {
          console.log(
            `waitForXpath after scroll failed -> ticker: ${ticker} -> analyst:${analystName} -> url: ${url}`
          )
        }
      }

      const values = await Promise.all(xPathArr.map(page.getTextByX))

      await page.closeSafe()
      console.log(`${analystName} PDF: done`)
      return values
    },

    async getPageCookies(url) {
      const page = await newPage(url)
      /** @type {array} */
      const cookieArr = await page.cookies()
      await page.closeSafe()
      return cookieArr.map(({ name, value }) => `${name}=${value}`).join("; ")
    },

    async fetchPageData({ url, xPathArr, analystName, existingPage, waitForXpath }) {
      if (!url && !existingPage) {
        console.log(`url failed -> ticker: ${ticker} -> analyst:${analystName}`)
        return {}
      }
      const page = existingPage || (await newPage(url, { waitUntil: "domcontentloaded" }))
      try {
        await page.waitForXPath(waitForXpath || xPathArr[0], { timeout: XPATH_TIMEOUT })
      } catch (err) {
        console.log("waitForXpath failed for url: " + url)
        if (page) {
          await page.closeSafe()
        }
        return {}
      }

      const values = await Promise.all(xPathArr.map(page.getTextByX))
      console.log(`${analystName} Page: done`)
      return { page, values }
    },
  }
}
