const { fetchWSJData } = require("../src/api")
require("../preload")
jest.setTimeout(10000)
describe.only("Scratch", () => {
  test("wsjData", async () => {
    const T = await fetchWSJData("T")
    await new Promise(res => setTimeout(res, 500))
    const SHOP = await fetchWSJData("SHOP")
    await new Promise(res => setTimeout(res, 500))
    const ZS = await fetchWSJData("ZS")

    expect(T.wsjChart[0]).toBeTruthy()
    expect(SHOP.wsjChart[0]).toBeTruthy()
    expect(ZS.wsjChart[0]).toBeTruthy()
  })
})
