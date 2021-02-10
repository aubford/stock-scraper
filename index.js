/**
 * @type {{Base64ScreenShotOptions:Base64ScreenShotOptions, AuthOptions:AuthOptions, ConsoleMessageLocation:ConsoleMessageLocation, Box:Box, DirectNavigationOptions:DirectNavigationOptions, Mouse:Mouse, ConnectOptions:ConnectOptions, Product:Product, StyleTagOptions:StyleTagOptions, EmulateOptions:EmulateOptions, ScriptTagOptions:ScriptTagOptions, Cookie:Cookie, NavigationOptions:NavigationOptions, JSONArray:JSONArray, Permission:Permission, Evalable:Evalable, PageCloseOptions:PageCloseOptions, BrowserEventObj:BrowserEventObj, product:Product, ChromeArgOptions:ChromeArgOptions, defaultArgs(options?: ChromeArgOptions):string[], SecurityDetails:SecurityDetails, Overrides:Overrides, JSEvalable:JSEvalable, MouseButtons:MouseButtons, executablePath():string, Frame:Frame, CustomQueryHandler:CustomQueryHandler, RespondOptions:RespondOptions, StartCoverageOptions:StartCoverageOptions, ConnectionTransport:ConnectionTransport, PageFnOptions:PageFnOptions, Serializable:Serializable, createBrowserFetcher(options?: FetcherOptions):BrowserFetcher, Platform:Platform, ScreenshotOptions:ScreenshotOptions, TargetAwaiter:TargetAwaiter, LoadEvent:LoadEvent, PageEventObj:PageEventObj, SerializableOrJSHandle:SerializableOrJSHandle, SameSiteSetting:SameSiteSetting, PDFFormat:PDFFormat, AXNode:AXNode, devices, Timeoutable:Timeoutable, Metrics:Metrics, ConsoleMessage:ConsoleMessage, Page:Page, ClickOptions:ClickOptions, CoverageEntry:CoverageEntry, EventEmitter:EventEmitter, JSONObject:JSONObject, GeoOptions:GeoOptions, registerCustomQueryHandler(name: string, queryHandler: CustomQueryHandler):void, Dialog:Dialog, WaitForSelectorOptionsHidden:WaitForSelectorOptionsHidden, SetCookie:SetCookie, clearCustomQueryHandlers():void, BoundingBox:BoundingBox, FrameBase:FrameBase, JSHandle:JSHandle, BrowserContextEventObj:BrowserContextEventObj, Worker:Worker, RemoteInfo:RemoteInfo, connect(options?: ConnectOptions):Promise<Browser>, Viewport:Viewport, BrowserOptions:BrowserOptions, Coverage:Coverage, SnapshopOptions:SnapshopOptions, Tracing:Tracing, LayoutDimension:LayoutDimension, HttpMethod:HttpMethod, PDFOptions:PDFOptions, BoxModel:BoxModel, UnwrapElementHandle:UnwrapElementHandle, RevisionInfo:RevisionInfo, customQueryHandlerNames():string[], TracingStartOptions:TracingStartOptions, errors, Response:Response, Target:Target, Keyboard:Keyboard, MousePressOptions:MousePressOptions, WrapElementHandle:WrapElementHandle, ElementHandle:ElementHandle, Touchscreen:Touchscreen, WaitForSelectorOptions:WaitForSelectorOptions, unregisterCustomQueryHandler(name: string):void, ErrorCode:ErrorCode, BrowserContext:BrowserContext, CDPSession:CDPSession, BrowserFetcher:BrowserFetcher, DialogType:DialogType, ResourceType:ResourceType, ConsoleMessageType:ConsoleMessageType, EvaluateFnReturnType:EvaluateFnReturnType, Browser:Browser, EvaluateFn:EvaluateFn, MediaType:MediaType, Headers:Headers, Accessibility:Accessibility, MediaFeature:MediaFeature, FetcherOptions:FetcherOptions, Request:Request, launch(options?: LaunchOptions):Promise<Browser>, FileChooser:FileChooser, BinaryScreenShotOptions:BinaryScreenShotOptions, DeleteCookie:DeleteCookie, LaunchOptions:LaunchOptions, TargetType:TargetType, ExecutionContext:ExecutionContext, MouseWheelOptions:MouseWheelOptions}}
 */
const puppeteer = require("puppeteer-extra")
const credentials = require("./creds.json")
const StealthPlugin = require("puppeteer-extra-plugin-stealth")
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker")
const _ = require("lodash")

puppeteer.use(AdblockerPlugin({ blockTrackers: true }))
puppeteer.use(StealthPlugin())

const getText = async (page, selector) => {
  const element = await page.$(selector)
  if (!element) {
    return "N/A"
  }
  const text = await element.evaluate(node => node.textContent)
  return text
}

/** @returns {Promise<Page>} */
const newPage = async (browser, url) => {
  /** @type {Page} */
  const page = await browser.newPage()
  await page.on("console", msg => console.log("PAGE LOG:", msg.text()))

  await page.goto(url)

  return page
}

async function schwabLogin(browser) {
  const page = await newPage(
    browser,
    "https://lms.schwab.com/Login?ClientId=schwab-secondary&Region=&RedirectUri=https://client.schwab.com/Login/Signon/AuthCodeHandler.ashx&StartInSetId=1"
  )

  await page.click("#LoginId")
  await page.keyboard.type(credentials.schwabUsername)
  await page.click("#Password")
  await page.keyboard.type(credentials.schwabPassword)
  await page.click("#LoginSubmitBtn")

  await page.waitForNavigation()

  return page
}

function main(tickers) {
  puppeteer.launch({ headless: false, slowMo: 251 }).then(async browser => {
    await schwabLogin(browser)
 
    const processPageData = async pageFunc => {
      const promises = tickers.map(ticker => pageFunc(ticker, browser))
      const data = await Promise.all(promises)
      return _.fromPairs(data)
    }

    const schwabData = await processPageData(scrapeSchwab)

    console.log(schwabData)

    await browser.close()
    process.exit(1)
  })
}

async function scrapeSchwab(ticker, browser) {
  const iframeSelector = "iframe#wsodIFrame"
  const creditSuisseSelector = ".ratingBar.creditSuisseBar .active"
  
  const page = await newPage(
    browser,
    `https://client.schwab.com/SymbolRouting.aspx?Symbol=${ticker}`
  )

  await page.waitForSelector(iframeSelector)
  
  /** @type {ElementHandle} */
  const iframeHandle = await page.$(iframeSelector)
  /** @type {Frame} */
  const frame = await iframeHandle.contentFrame()
  
  await frame.waitForSelector(creditSuisseSelector)
  const creditSuisseRating = await getText(frame, creditSuisseSelector)

  return [
    ticker,
    {
      creditSuisseRating
    }
  ]
}

const tickers = [
  "C",
  "BA",
  "JPM",
  "BLK",
  "GS",
  "UVSP",
  "FHB",
  "ISBC",
  "V",
  "MA",
  "AXP",
  "SEDG",
  "ATVI"
]

main(tickers)

// https://www.schwab.wallst.com/research/Client/Stocks/Summary?XXX104_PtYlYhyLn3p5rp9I0GEQEnDZsA/zZk9J73uoJxBOfYdc2/E3eSiE5kJjNcHDv9MZA9y3zns/L04vSNSA9Gj6z2R10JdEm4yDHzLL4Nca3fpXqRw/Nr8Azygln6drIiNjqCXiVUm1DyoJrvJEdF26HA==&p3=N&symbol=C&_PC=S1
