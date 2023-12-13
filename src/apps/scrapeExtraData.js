const Cheerio = require("cheerio")
const { goToNewBrowserPage, connectAndRunApp } = require("../puppeteer-utils")
const { metaWriteOut, ReError } = require("../util")
const { webSocketDebuggerUrl } = require("../../ws.json")
const { fromPairs, isArray, findIndex, uniq } = require("lodash")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800,
  },
}

const getMagicFormulaData = async (minMarketCap, cookieArr) => {
  const cookie = cookieArr.map(({ name, value }) => `${name}=${value}`).join("; ")
  const response = await fetch(
    "https://www.magicformulainvesting.com/Screening/StockScreening",
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,es;q=0.8",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua": '"Chromium";v="88", "Google Chrome";v="88", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        referrer: "https://www.magicformulainvesting.com/Screening/StockScreening",
        referrerPolicy: "strict-origin-when-cross-origin",
        cookie,
      },
      body: `MinimumMarketCap=${minMarketCap}&Select30=false&stocks=Get+Stocks`,
      method: "post",
    }
  )

  const text = await response.text()

  const $ = Cheerio.load(text)
  return $("#content .screeningdata tbody tr")
    .map((i, tr) =>
      $(tr)
        .children("td")
        .map((i, td) => $(td).text())
    )
    .toArray()
    .map(row => row.get())
    .map(f => f[1])
}

const aggregateMagicFormulaTickers = async cookies => {
  const microCap = await getMagicFormulaData(50, cookies)
  const midCap = await getMagicFormulaData(2000, cookies)
  const largeCap = await getMagicFormulaData(10 * 1000, cookies)
  return uniq([...microCap, ...midCap, ...largeCap])
}

const getBuffetData = async () => {
  const response = await fetch("https://dataroma.com/m/m_activity.php?m=BRK&typ=a")
  const text = await response.text()

  const $ = Cheerio.load(text)

  const dataArr = $(`table#grid > tbody > tr`)
    .map((i, node) => [
      [
        $(node).children(`td.stock`).text().split(" - ")[0],
        $(node).children(`td.buy:first`).text() || $(node).children(`td.sell:first`).text(),
      ],
    ])
    .toArray()
    .slice(1)

  const chunk = dataArr.slice(
    0,
    findIndex(dataArr, val => val[0] === "" && val[1] === "")
  )
  return fromPairs(chunk)
}

connectAndRunApp(async browser => {
  const newPage = url =>
    goToNewBrowserPage(browser, url).catch(err => {
      throw new ReError("goToNewBrowserPage failed", err, "scrapeExtraData")
    })

  const page = await newPage("https://www.magicformulainvesting.com/Screening/StockScreening")

  await page.waitForSelector(`.nav-text`)
  if (await page.$("input#login")) {
    await page.click(`input#login`)
  }

  const cookies = await page.cookies()

  const magicTickers = await aggregateMagicFormulaTickers(cookies)
  const buffetData = await getBuffetData()

  if (!isArray(magicTickers)) {
    throw new Error("***  FAILURE: magicTickers is not an Array ***")
  }

  console.log("Magic Tickers: ", magicTickers)
  console.log("Buffett Data: ", buffetData)

  metaWriteOut({
    magicTickers,
    buffetData,
  })
  process.exit(0)
})
