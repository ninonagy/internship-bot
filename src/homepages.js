var puppeteer = require("puppeteer");
var fs = require("fs");

startBrowser = async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  return { browser, page };
};

var imageCount = 0;

async function takeSc(browser, page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    let imageName = imageCount++;
    await page.screenshot({ path: `./images/${imageName}.png` });
  } catch (err) {
    console.log(err);
  }
}

(async () => {
  try {
    const { browser, page } = await startBrowser();

    let urls = JSON.parse(fs.readFileSync("jobfair-companies-list.json"));

    for (var i = 0; i < urls.length; i++) {
      await takeSc(browser, page, urls[i]);
    }

    await browser.close();
  } catch (err) {
    console.log(err);
    await browser.close();
  }
})();
