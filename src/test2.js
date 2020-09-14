const puppeteer = require("puppeteer");

async function run() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const mainUrl = "https://www.arm.com/saved-jobs";
  
  let mainUrlStatus;
  
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    console.log("request url:", url);
    request.continue();
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    console.log("request failed url:", url);
  });
  page.on("response", (response) => {
    const request = response.request();
    const url = request.url();
    const status = response.status();
    console.log("response url:", url, "status:", status);
    if (url === mainUrl) {
      mainUrlStatus = status;
    }
  });
  await page.goto(mainUrl);
  console.log("status for main url:", mainUrlStatus);
  const html = await page.content();
  await browser.close();
}

run();
