const { runDebug } = require("../src/util/runDebug")

runDebug(
  (ticker, browser) =>
    require("../src/sources").cfra.fetch(
      ticker,
      "3 out of 5 stars",
      "https://olui2.fs.ml.com/MDWSODUtility/PdfLoader.aspx?src=%2fnet%2fUtil%2fGetPdfFile%3fdockey%3d72-60770K10-7KDO2I4I7NBVVR4K1C7MMR593D",
      browser
    ),
  { ticker: "AXP", login: ["Merrill"] }
)
