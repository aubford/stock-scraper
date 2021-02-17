const puppeteer = require("puppeteer")
const _ = require("lodash")
const { newBrowserPage, evalX } = require("./util")
const { webSocketDebuggerUrl } = require("./ws.json")

const connection = {
  browserWSEndpoint: webSocketDebuggerUrl,
  defaultViewport: {
    width: 1400,
    height: 1800
  }
}

/* NOTES

webSocketDebuggerUrl

 */

puppeteer.connect(connection).then(async browser => {
  const ticker = "GS"
  const newPage = url => newBrowserPage(browser, url)

  const getFidelityData = async () => {
    const page = await newPage(
      `https://eresearch.fidelity.com/eresearch/goto/evaluate/analystsOpinions.jhtml?symbols=${ticker}`
    )
    const fidelityStarmineOneName = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[1]/td[1]/span`
    )
    const fidelityStarmineTwoName = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[2]/td[1]/span`
    )
    const fidelityStarmineThreeName = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[3]/td[1]/span`
    )
    const fidelityStarmineFourName = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[4]/td[1]/span`
    )
    const fidelityStarmineFiveName = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[5]/td[1]/span`
    )
    const fidelityStarmineOneRating = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[1]/td[3]/span[@class="opinion"]`
    )
    const fidelityStarmineTwoRating = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[2]/td[3]/span[@class="opinion"]`
    )
    const fidelityStarmineThreeRating = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[3]/td[3]/span[@class="opinion"]`
    )
    const fidelityStarmineFourRating = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[4]/td[3]/span[@class="opinion"]`
    )
    const fidelityStarmineFiveRating = await page.getTextByX(
      `//table[@id="sentSummaryTable"]/tbody/tr[5]/td[3]/span[@class="opinion"]`
    )

    const analysts = await page.getTextByX(`//table[@id="allOpinionsTable"]/tbody/tr/td[1]/span`)
    const reportHrefsHandles = await page.$x(`//table[@id="allOpinionsTable"]/tbody/tr/td[9]`)

    const getReportLink = node => {
      const href = node.href
      if (href === "javascript:void(0);") {
        return node.getAttribute("onclick").split(`'`)[1]
      }
      return href
    }
    const reportHrefs = await Promise.all(
      reportHrefsHandles.map(handle => evalX(handle, "a", getReportLink))
    )

    //console.log(analysts)
    console.log(reportHrefs)

    await page.close()
    return {
      fidelityStarmineOne: `${fidelityStarmineOneName} - ${fidelityStarmineOneRating}`,
      fidelityStarmineTwo: `${fidelityStarmineTwoName} - ${fidelityStarmineTwoRating}`,
      fidelityStarmineThree: `${fidelityStarmineThreeName} - ${fidelityStarmineThreeRating}`,
      fidelityStarmineFour: `${fidelityStarmineFourName} - ${fidelityStarmineFourRating}`,
      fidelityStarmineFive: `${fidelityStarmineFiveName} - ${fidelityStarmineFiveRating}`
    }
  }

  const fidelityData = await getFidelityData()

  process.exit(0)
})
