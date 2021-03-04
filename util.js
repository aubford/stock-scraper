require("puppeteer-core")
const readline = require("readline")
const fs = require("fs")
const fetch = require("node-fetch")
const _ = require("lodash")
/**
 * @typedef {Page} MyPage
 * @property getTextByX
 * @property closeSafe
 * @property error
 */

const XPATH_TIMEOUT = 20000

/**
 * @param page {MyPage}
 * @param selector {string}
 * @returns {Promise<string|string[]>}
 */
const getTextByX = async (page, selector) => {
  /** @type {ElementHandle[]} */
  const elementArr = await page.$x(selector)
  if (!elementArr.length) {
    return ""
  }
  if (elementArr.length === 1) {
    return await elementArr[0].evaluate(node => node.textContent)
  }
  return await Promise.all(
    elementArr.map(element => element.evaluate(node => node.textContent))
  )
}

/** @returns {Promise<MyPage>} */
const newBrowserPage = async (browser, url, options = {}) => {
  /** @type {MyPage} */
  const page = await browser.newPage()

  try {
    await page.goto(url, options)
  } catch (err) {
    console.log("Error loading page:" + err)
    page.error = error
    return page
  }

  page.getTextByX = text => getTextByX(page, text)
  page.closeSafe = () => page.close().catch(err => err)
  return page
}

const parseStreetBulletData = (lineOne, lineTwo) => {
  const firstBulletIndicators = [
    { indicator: "Premium", value: [2, 1] },
    { indicator: "Discount", value: [4, 5] },
    { indicator: "Average", value: [3, 3] },
    { indicator: "Higher", value: [4, 5] },
    { indicator: "Lower", value: [2, 1] },
  ]
  const fullTextBullets = _.zipWith(lineOne, lineTwo, (a, b) => `${a} ${b}`)
  const chunked = _.chunk(fullTextBullets, 2)
  const mapped = chunked.map(([bulletA, bulletB]) => {
    if (bulletA.includes("Neutral")) {
      return ""
    }
    return firstBulletIndicators.find(({ indicator }) => bulletA.includes(indicator))
      .value[bulletB.includes("significant") ? 1 : 0]
  })

  return _.fromPairs(
    _.zip(
      [
        "streetPE",
        "streetPCF",
        "streetProjEarn",
        "streetPEG",
        "streetPB",
        "streetEarningsGrowth",
        "streetPSales",
        "streetSalesGrowth",
      ],
      mapped
    )
  )
}

/**
 * @param {Frame|Page|ElementHandle} frame
 * @param selector {string}
 * @param func {function}
 * @returns {Promise<string|string[]>}
 */
const evalX = async (frame, selector, func) => {
  const elementArr = (await frame.$x(selector)) || []
  if (!elementArr.length) {
    return ""
  }
  if (elementArr.length === 1) {
    return await elementArr[0].evaluate(func)
  }
  return await Promise.all(elementArr.map(element => element.evaluate(func)))
}

const chars = text => text.replace(/\s/g, "")
const matchChars = text => `translate(text()," ","")="${chars(text)}"`
const containsChars = text => `contains(translate(text()," ",""),"${chars(text)}")`
const prevSiblingTextContains = (text, num = 1) =>
  `//span[${containsChars(text)}]/following-sibling::span[${num}]`
const prevSiblingTextIs = (text, num = 1) =>
  `//span[${matchChars(text)}]/following-sibling::span[${num}]`
const followingSiblingTextIs = (text, num = 1) =>
  `//span[${matchChars(text)}]/preceding-sibling::span[${num}]`

const hasCFRA = (rating, ticker, analystName) => {
  const hasReport = rating !== "no rating"
  if (!hasReport) {
    console.log(`no report -> ticker: ${ticker} -> analyst:${analystName}`)
  }
  return hasReport
}

const SCRAPBOOK_LOCATION = "/Users/aubrey/Google Drive/stock-scrapbook"
const writeOut = data => {
  const stockDataLocation = `${SCRAPBOOK_LOCATION}/stockData.json`
  const stockDataFile = fs.readFileSync(stockDataLocation)
  const existingData = JSON.parse(stockDataFile)
  const writeToFile = {
    ...existingData,
    ...data,
  }

  fs.writeFile(stockDataLocation, JSON.stringify(writeToFile), err => {
    console.log("** COMPLETE, WRITING TO FILE **")
    if (err) {
      console.log("File Write Error: " + err)
    }
    process.exit(0)
  })
}

const getMoodysLink = async (ticker, cookie) => {
  /** @type {*} */
  const response = await fetch(
    "https://www.moodys.com/services/mdc-global?name=getTypeAheadResult",
    {
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9,es;q=0.8",
        "content-type": "application/json",
        "sec-ch-ua": '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-lang": "en",
        cookie,
      },
      referrer:
        "https://www.moodys.com/credit-ratings/ATT-Inc-credit-rating-702550/reports?category=Ratings_and_Assessments_Reports_rc|Issuer_Reports_rc|Issuer_Data_Reports&type=Rating_Action_rc|Announcement_rc|Announcement_of_Periodic_Review_rc,Credit_Opinion_ir_rc,Peer_Snapshot_rc",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: `{"data":["${ticker}","en"]}`,
      method: "POST",
      mode: "cors",
    }
  )
  const text = await response.text()
  const data = JSON.parse(text).data.organizations[0]
  return data && data.ticker === ticker ? data : null
}

const makeScrapeTools = (ticker, browser) => {
  const newPage = (url, options) => newBrowserPage(browser, url, options)
  const fetchPdfData = async ({
    url,
    xPathArr,
    screenShotArr,
    waitForPostScroll,
    analystName,
    timeout = XPATH_TIMEOUT,
  }) => {
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
  }

  const fetchPageData = async ({ url, xPathArr, analystName, existingPage }) => {
    if (!url && !existingPage) {
      console.log(`url failed -> ticker: ${ticker} -> analyst:${analystName}`)
      return {}
    }
    const page = existingPage || (await newPage(url, { waitUntil: "domcontentloaded" }))
    try {
      await page.waitForXPath(xPathArr[0], { timeout: XPATH_TIMEOUT })
    } catch (err) {
      console.log("waitForXpath failed for url: " + url)
      await page.closeSafe()
      return {}
    }

    const values = await Promise.all(xPathArr.map(page.getTextByX))
    console.log(`${analystName} Page: done`)
    return { page, values }
  }

  const fetchFidelityPageData = async (fidelityPage, fidelityReportNameArr) => {
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
  }

  const getPageCookies = async url => {
    const page = await newPage(url)
    /** @type {array} */
    const cookieArr = await page.cookies()
    await page.closeSafe()
    return cookieArr.map(({ name, value }) => `${name}=${value}`).join("; ")
  }

  return {
    fetchFidelityPageData,
    fetchPageData,
    fetchPdfData,
    getPageCookies,
  }
}

const promptForTickers = async () => {
  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    readlineInterface.question("Tickers: ", tickers => {
      resolve(tickers)
      readlineInterface.close()
    })
  })
}

const promptLogin = newPage => {
  const pages = [
    "https://olui2.fs.ml.com/TFPHoldings/HoldingsByAccount.aspx?as_cd=1.4.2147483647.-1",
    "https://oltx.fidelity.com/ftgw/fbc/oftop/portfolio#summary",
    "https://www.moodys.com/credit-ratings/ATT-Inc-credit-rating-702550",
  ].map(url => newPage(url, { waitUntil: "domcontentloaded" }))

  return () =>
    Promise.all(pages).then(pages =>
      pages.forEach(page => {
        page.closeSafe()
      })
    )
}

module.exports = {
  ARGUS_ANALYST_KEY: "Argus Analyst",
  ARGUS_RESEARCH_KEY: "Argus Research A6/Quantitative (i)",
  ZACKS_KEY: "Zacks Investment Research, Inc (i)",
  XPATH_TIMEOUT,
  FIDELITY: "fidelity",
  FORD: "ford",
  NEW_CONSTRUCTS: "nc",
  THE_STREET: "theStreet",
  ARGUS_ANALYST: "argusAnalyst",
  ARGUS_RESEARCH: "argusResearch",
  ZACKS: "zacks",
  MORNINGSTAR: "morningstar",
  CFRA: "CFRA",
  BOA: "BoA",
  PAUSE_MS: process.argv.length > 2 ? Number(process.argv[2]) * 1000 : 3000,
  SCRAPBOOK_LOCATION,
  extractNumbers: text => (text ? text.match(/[\d,\\.]/g).join("") : ""),
  makeScrapeTools,
  getMoodysLink,
  writeOut,
  newBrowserPage,
  parseStreetBulletData,
  evalX,
  prevSiblingTextIs,
  prevSiblingTextContains,
  followingSiblingTextIs,
  getTextByX,
  hasCFRA,
  promptForTickers,
  promptLogin,
}
