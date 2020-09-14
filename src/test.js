var puppeteer = require("puppeteer");
const pc = require("page-content");
var fs = require("fs");
var normalizeUrl = require("normalize-url");
var urlTool = require("url-toolkit");

const log = console.log;

// startBrowser = async () => {
//   const browser = await puppeteer.launch({
//     headless: true,
//     args: ["--lang=en-US"],
//   });
//   const page = await browser.newPage();
//   return { browser, page };
// };

// (async () => {
//   let { browser, page } = await startBrowser();

//   let baseUrl = "https://www.arm.com/";
//   let baseUrlStatus;

//   baseUrl = new URL(baseUrl).href;

//   page.on("response", (response) => {
//     const request = response.request();
//     const url = new URL(request.url()).href;
//     const status = response.status();
//     log("response url:", url, "status:", status);
//     if (url === baseUrl) {
//       baseUrlStatus = status;
//     }
//   });

//   await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

//   log("baseUrl status: ", baseUrlStatus);

//   await browser.close();
// })();

pc.parseFromURL("https://clover.studio/jobs").then((res) => {
  // console.log(res);
  fs.writeFile("content.json", JSON.stringify(res), (err) => {
    if (err) throw err;
    console.log("Done!");
  });
});
