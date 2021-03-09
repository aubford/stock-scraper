const puppeteer = require("puppeteer-core")
const makeScrapeTools = require("./makeScrapeTools")
const {
  evalX,
  newBrowserPage,
  prevSiblingTextIs,
  prevSiblingTextContains,
  followingSiblingTextIs,
  hasCFRA,
  writeOut,
  promptForTickers,
  promptLogin,
  extractNumbers,
} = require("./util")

fs.copyFileSync(STOCK_DATA_LOCATION, STOCK_DATA_BACKUP_LOCATION)

/** @type {*} */
const stockDataFile = fs.readFileSync(STOCK_DATA_LOCATION)
const { magicTickers, buffetData, ...stockData } = JSON.parse(stockDataFile)

puppeteer.connect(CONNECTION).then(async browser => {
  const newPage = (url, options) => newBrowserPage(browser, url, options)

  const closeLoginPages = await promptLogin(newPage)
  const promptResponse = await promptForTickers()
  const tickers = promptResponse ? promptResponse.split(/[^A-Z]/) : Object.keys(stockData)

  console.log("Searching for tickers:", tickers)

  closeLoginPages()

  for (const ticker of tickers) {
    const { fetchPageData, fetchPdfData, fetchFidelityPageData, getPageCookies } = makeScrapeTools(
      ticker,
      browser
    )

    const [ncRating, [ncRatingB, ncRoic, ncFCF, ncEps, ncGap, ncPB] = []] = await fetchPdfData({
      analystName: NEW_CONSTRUCTS,
      url: `https://research.ameritrade.com/grid/wwws/research/reports/viewreport?id=2942&documenttag=${ticker}&c_name=invest_VENDOR`,
      xPathArr: [
        prevSiblingTextContains("(MM)"),
        `//span[text()="1 - Very Attractive" or text()="2 - Attractive" or text()="3 - Neutral"  or text()="4 - Unattractive" or text()="5 - Very Unattractive"]`,
      ],
      waitForPostScroll: `/html/body/div[1]/div[2]/div[4]/div/div[3]/div[2]/span[49]`,
    })

    if (ncRating !== ncRatingB) {
      throw new Error("*** NC Rating mismatch error !!!!")
    }

    stockData[ticker] = {
      ...stockData[ticker],
      ncRating,
      ncRoic,
      ncFCF,
      ncEps,
      ncGap,
      ncPB,
    }
  }

  writeOut({ ...stockData, magicTickers, buffetData })
})
