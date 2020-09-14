var puppeteer = require("puppeteer");
var normalizeUrl = require("normalize-url");
var fs = require("fs");
const isUrl = require("is-url");
var urlTool = require("url-toolkit");

const log = console.log;

startBrowser = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  return { browser, page };
};

async function getAlternativeUrl(page, baseUrl) {
  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

    // Scrape hreflang 'en' tag from head
    let enUrl = await page.evaluate(() => {
      let el = document.head.querySelectorAll(
        "link[hreflang='en'], link[hreflang='en-US'], link[hreflang='en-us'], link[hreflang='gb'], link[hreflang='en-GB']"
      )[0];
      return el ? el.getAttribute("href") : "/";
    });

    let altUrl = urlTool.buildAbsoluteURL(baseUrl, enUrl);
    log(`base: ${baseUrl} \t\t\t en: ${enUrl} \t\t\t alt: ${altUrl}`);

    return altUrl;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function validateUrls(urls) {
  let validUrls = [];
  urls.forEach((url, i) => {
    if (isUrl(url)) {
      let baseUrl = normalizeUrl(url);
      validUrls.push(baseUrl);
    } else {
      console.log(`Removed ${url}`);
    }
  });
  return validUrls;
}

(async () => {
  try {
    const { browser, page } = await startBrowser();

    let website = "https://jobfair.fer.unizg.hr/";
    await page.goto(website);

    // Query all a links
    let urls = await page.evaluate(() => {
      let companies = document.querySelector("#companies");
      let els = companies.querySelectorAll("a[href]");
      let urls = [];
      for (let i = 0; i < els.length; i++) {
        let url = els[i].getAttribute("href");
        urls[i] = url;
      }
      return urls;
    });

    let validUrls = await validateUrls(urls);
    validUrls = [...new Set(validUrls)]; // Remove duplicates

    let finalUrls = [];
    for (let i = 0; i < validUrls.length; i++) {
      let url = await getAlternativeUrl(page, validUrls[i]);
      if (url) finalUrls.push(url);
    }

    // Store urls to json
    fs.writeFile(
      "jobfair-companies-list.json",
      JSON.stringify(finalUrls),
      (err) => {
        if (err) throw err;
        console.log("Done writing");
      }
    );

    await browser.close();
  } catch (err) {
    console.log(err);
    await browser.close();
  }
})();
