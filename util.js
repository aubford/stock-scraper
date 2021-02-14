/**
 * @typedef {Page} MyPage
 * @property getTextByX
 */

const getTextByX = async (page, selector) => {
  const element = await page.$x(selector)
  if (!element[0]) {
    return "N/A"
  }
  const text = await element[0].evaluate(node => node.textContent)
  return text
}

/** @returns {Promise<MyPage>} */
const newBrowserPage = async (browser, url) => {
  /** @type {MyPage} */
  const page = await browser.newPage()
  
  await page.goto(url)

  page.getTextByX = text => getTextByX(page, text)
  return page
}

module.exports = {
  newBrowserPage
}
