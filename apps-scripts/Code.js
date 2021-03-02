const Cheerio = require("cheerio")
const driveData = require("/Users/aubrey/workspace/stock-scraper/stockData.json")




// Google Drive
function getDriveData() {
  return driveData
}



// ⭐︎ FETCH COMPANY DATA ⭐︎
function fetchCompanyData(tickers) {
  const {magicTickers, buffetData, ...analystData} = getDriveData()
  return tickers.map(ticker => {
    const driveTickerData = analystData[ticker] || {}
    return {
      ...driveTickerData,
      isMagic: magicTickers.includes(ticker),
      buffetData: buffetData[ticker]
    }
  })
}

fetchCompanyData(["PEAK", "O"]) /* ?+*/
