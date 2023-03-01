const Logger = require("../Logger")
const Cheerio = require("cheerio")
const { makePrettyDate, pause } = require("../util")
const { fetchText } = require("./util")
const vooData = require("../../vooData.json")
const stockData = require("../../stockData.json")

const buildWsjData = ({ wsjChart, ...wsjData }) => {
  return {
    wsjChartThreeMonthAgo: wsjChart
      ? wsjChart
          .filter((d, idx) => idx % 3 === 0)
          .map(str => Number(str))
          .reverse()
      : "",
    wsjChartMonthAgo: wsjChart
      ? wsjChart
          .filter((d, idx) => (idx + 2) % 3 === 0)
          .map(str => Number(str))
          .reverse()
      : "",
    wsjChartCurrent: wsjChart
      ? wsjChart
          .filter((d, idx) => (idx + 1) % 3 === 0)
          .map(str => Number(str))
          .reverse()
      : "",
    wsjChartCurrentNum: wsjChart
      ? wsjChart
          .filter((d, idx) => (idx + 1) % 3 === 0)
          .reduce((acc, curr) => acc + Number(curr), 0)
      : "",
    ...Object.fromEntries(Object.entries(wsjData).filter(([, value]) => value)), // remove entries w/ falsy values
  }
}

/**
 * @param ticker {string}
 * @param tries {number}
 * @returns {Promise<{wsjChart,wsjShortPct,wsjShortChange}> | []}
 */
exports.fetch = async (ticker, tries = 0) => {
  const logger = new Logger(ticker, "WSJ")
  const url = `https://www.wsj.com/market-data/quotes/${ticker}`
  const fetchOpts = {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "max-age=0",
      "sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="101", "Opera";v="87"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "cross-site",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      // cookie:
      //   "ntvSession={}; gdprApplies=false; ccpaApplies=true; ab_uuid=de0489f2-963e-4eb2-98ca-a52476c9084d; usr_bkt=ixi4E5ylqa; consentUUID=8c8c9da3-a7fe-4dcb-972b-1f56eb41a3ff; AMCVS_CB68E4BA55144CAA0A4C98A5%40AdobeOrg=1; _scid=1b02f3e8-5e8f-4927-a59d-97fc33aa2e1f; _li_dcdm_c=.wsj.com; _lc2_fpi=7880a1137012--01fr13ccwmftb3st07ry82pv44; _ncg_id_=05485af1-fd1f-4bf5-848d-afd5394ae2fc; s_cc=true; cX_P=kxqf4b1tuzvpagn8; cX_S=kxqf4b1ykod78gsd; __gads=ID=607285d71f2a0cc4:T=1640714618:S=ALNI_MbIl7FPBNMfhHw8v_z3Zf4yHZ1jfw; permutive-id=8c7c2afa-10bf-46ff-88fa-02d960524f89; cX_G=cx%3Aovo0qshxwwfa3k62fyruhcteu%3A1cr8i5w8oghje; djvideovol=1; _sctr=1|1641974400000; _tq_id.TV-63639009-1.1fc3=f8028b4fc4aeaba0.1640714614.0.1642016365..; permutive-session=%7B%22session_id%22%3A%2236124c88-eca9-4a00-8340-c975082d0546%22%2C%22last_updated%22%3A%222022-01-12T19%3A39%3A26.072Z%22%7D; _pin_unauth=dWlkPU5qSTFNR0ZqTTJJdFpUY3dOQzAwTXpJeUxXRXdaVGN0Tm1ReVkyWmxNV013T1dNdw; has_optimizely=true; optimizelyEndUserId=oeu1652723895620r0.20432943885002075; _gcl_au=1.1.917510118.1652723906; _ncg_domain_id_=05485af1-fd1f-4bf5-848d-afd5394ae2fc.1.1652723902.1715795902; _ncg_g_id_=0e23c29c-24ef-43ac-8e8b-e800552b93e3.3.1652723906.1715795902; _fbp=fb.1.1652723906720.687917938; OB-USER-TOKEN=bce2d57a-c5ba-4076-b449-0832d27ab133; ki_t=1652723907067%3B1652723907067%3B1652723907067%3B1%3B1; ki_r=aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS8%3D; wsjregion=na%2Cus; _sp_v1_uid=1:86:a89d2c38-428e-471a-a3c9-0c7674727a8b; _sp_v1_ss=1:H4sIAAAAAAAAAItWqo5RKimOUbLKK83J0YlRSkVil4AlqmtrlXSoqiwWACMYp9h2AAAA; _sp_v1_opt=1:; _sp_v1_csv=null; _sp_v1_lt=1:; DJSESSION=country%3Dus%7C%7Ccontinent%3Dna%7C%7Cregion%3Dca%7C%7Ccity%3Dlosangeles%7C%7Clatitude%3D33.9733%7C%7Clongitude%3D-118.2487%7C%7Ctimezone%3Dpst%7C%7Czip%3D90001-90068%2B90070-90084%2B90086-90089%2B90091%2B90093-90096%2B90099%2B90189; _am_sp_djcsses.1fc3=*; _ncg_sp_ses.5378=*; hok_seg=none; usr_prof_v2=eyJwIjp7InBzIjowLjE4LCJxIjowLjY0fSwiaWMiOjN9; utag_main=v_id:017e02362e88001a2784f58351b70508a003c08200fb8$_sn:9$_se:6$_ss:0$_st:1656090900214$vapi_domain:wsj.com$ses_id:1656088691449%3Bexp-session$_pn:6%3Bexp-session$_prevpage:WSJ_ResearchTools_Market%20Data%20Center_Quotes_Researchratings%3Bexp-1656092700217; AMCV_CB68E4BA55144CAA0A4C98A5%40AdobeOrg=1585540135%7CMCIDTS%7C19168%7CMCMID%7C39225633381824831580398283561946864765%7CMCAAMLH-1653328698%7C9%7CMCAAMB-1656088690%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1656096300s%7CNONE%7CMCAID%7CNONE%7CMCSYNCSOP%7C411-18997%7CvVersion%7C4.4.0; _am_sp_djcsid.1fc3=0c0a91fb-7da9-4be8-869a-5d65d13b78a8.1640714613.9.1656089100.1655832844.523064c4-119f-4e89-a9e8-00570f0ce9f8; _ncg_sp_id.5378=05485af1-fd1f-4bf5-848d-afd5394ae2fc.1640714614.9.1656089100.1655832844.86faec17-ff7b-4b02-a8b2-822f3b4bc39c; s_tp=2648; s_ppv=WSJ_ResearchTools_Market%2520Data%2520Center_Quotes_Researchratings%2C51%2C51%2C1340; _sp_v1_data=2:371407:1655829925:0:9:0:9:0:0:_:-1",
      Referer: `https://www.wsj.com/market-data/quotes/${ticker}`,
      // "Referrer-Policy": "origin",
    },
    body: null,
    method: "GET",
  }

  try {
    const [mainPage, researchPage, financialsPage] = await Promise.stagger(
      fetchText,
      [
        [url, fetchOpts],
        [url + "/research-ratings", fetchOpts],
        [url + "/financials", fetchOpts],
      ],
      800
    )
    const analystRatingsDoc = Cheerio.load(/**@type * */ researchPage)
    const wsjChart = analystRatingsDoc(".cr_analystRatings .data_data")
      .contents()
      .get()
      .map(node => node.data)

    const [, wsjHighTarget, , wsjMedianTarget, , wsjLowTarget, , wsjAverageTarget] =
      analystRatingsDoc(".cr_data.rr_stockprice .data_data")
        .contents()
        .get()
        .map(node => node.data)

    const mainPageDoc = Cheerio.load(/**@type * */ mainPage)
    const financialsPageDoc = Cheerio.load(/**@type * */ financialsPage)

    const wsjShortDateRaw = mainPageDoc(`h3:contains("Short Interest ") span`).text()
    const wsjShortDate = wsjShortDateRaw
      ? wsjShortDateRaw.replace("(", "").replace(")", "")
      : wsjShortDateRaw

    const retVal = {
      wsjPriceTargets: `$${wsjLowTarget} - $${wsjAverageTarget} ($${wsjMedianTarget}) - $${wsjHighTarget}`,
      wsjHighTarget,
      wsjMedianTarget,
      wsjLowTarget,
      wsjAverageTarget,
      wsjUpdatedAt: makePrettyDate(),
      wsjChart,
      wsjShortPct: mainPageDoc(`h5:contains("Percent of Float")`).next().text(),
      wsjShortChange: mainPageDoc(`h5:contains("Change from Last")`).next().text(),
      wsjShortDate,
      wsjLastEarningsDate: financialsPageDoc(`span.data_lbl:contains("Last Report")`)
        .next()
        .text(),
      wsjNextEarningsDate: financialsPageDoc(`span.data_lbl:contains("Next Report")`)
        .next()
        .text(),
    }

    if (retVal.wsjChart?.length === 0 && tries < 6) {
      logger.error("NO CHART!")

      const shouldHaveChart =
        stockData[ticker]?.wsjChartCurrent?.length !== 0 ||
        vooData[ticker]?.wsjChartCurrent?.length !== 0

      if (shouldHaveChart || tries < 3) {
        logger.error("RETRY WSJ!")
        await pause(1000 * tries)
        return exports.fetch(ticker, tries + 1)
      }
    }

    logger.completeOk("Done")

    return buildWsjData(retVal)
  } catch (err) {
    logger.error("fetch error: ", err)
    return []
  }
}
