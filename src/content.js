var puppeteer = require("puppeteer");
const pc = require("page-content");
var fs = require("fs");
var urlTool = require("url-toolkit");

const metascraper = require("metascraper")([
  require("metascraper-title")(),
  require("metascraper-description")(),
  require("metascraper-image")(),
  require("metascraper-date")(),
]);

// const log = console.log;
const logger = require("simple-node-logger").createSimpleLogger("log.txt");

const log = (msg) => logger.info(msg);
const warn = (msg) => logger.log("warn", msg);

/*
TODO:

[ ] Scrape body
[ ] Add company field

 */

startBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--lang=en-US"],
  });
  const page = await browser.newPage();
  return { browser, page };
};

async function storeInfo(obj = {}) {
  fs.writeFile("content.json", JSON.stringify(obj), (err) => {
    if (err) throw err;
    log("Done!");
  });
}

const CAREERS_KEYWORDS = [
  "careers",
  "career",
  "jobs",
  "join us",
  "work in",
  "intern",
  "internship",
  "academy",
  "student",
];

const INTERN_KEYWORDS = ["intern", "internship", "academy", "students"];

function isValidUrl(str) {
  var pattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  ); // fragment locator
  return !!pattern.test(str);
}

function findLinks(markup, baseUrl) {
  let links = [];
  if (markup) {
    let reg = new RegExp(`(\\b${CAREERS_KEYWORDS.join("\\b|\\b")}\\b)`);
    markup.links.find(({ anchor, text, rel, location }) => {
      if (reg.test(text.toLowerCase())) {
        let url = urlTool.buildAbsoluteURL(baseUrl, anchor);
        // if valid and unique
        if (isValidUrl(url) && !links.find((x) => x.url === url)) {
          links.push({ url, location });
          log(`Found ${url} ${location}`);
        }
      }
    });
  }
  return links;
}

async function getHtml(page, baseUrl) {
  try {
    let baseUrlStatus;
    baseUrl = new URL(baseUrl).href;

    page.on("response", (response) => {
      const request = response.request();
      const url = new URL(request.url()).href;
      const status = response.status();
      if (url === baseUrl) {
        baseUrlStatus = status;
      }
    });

    await page.goto(baseUrl, {
      waitUntil: "domcontentloaded",
    });

    let html = await page.content();

    warn(`${baseUrl} status: ${baseUrlStatus}`);

    return {
      html,
      markup: pc.parseFromHTML(html),
      ok: baseUrlStatus == 200 || baseUrlStatus == 301 || baseUrlStatus == 302,
    };
  } catch (err) {
    log(err);
    return { markup: null, html: null };
  }
}

async function scrapePage(
  page,
  baseUrl,
  links = { queue: [], visited: [], stored: [] }
) {
  try {
    let queueIndex = links.queue.length - 1;
    let { url, location } = links.queue[queueIndex] || {
      url: baseUrl,
      location: null,
    };

    if (url === baseUrl && !links.visited.length)
      links.queue.push({ url, location });

    if (links.queue.length === 0) {
      log("No more in queue");
      return links.stored;
    }

    log(`Queue ${url} ${location}`);
    let { markup, html, ok } = await getHtml(page, url);

    // Dequeue visited link
    links.visited.push(links.queue.pop());

    if (ok) {
      let found = findLinks(markup, baseUrl);
      // Push unique links to queue
      if (found.length) {
        found.forEach((item) => {
          // Make sure that link is unique
          if (
            !links.visited.find((x) => x.url === item.url) &&
            !links.queue.find((x) => x.url === item.url)
          ) {
            links.queue.push(item);
            log(`Unique ${item.url} ${item.location}`);
          }
        });
      }

      // We found something interesting

      let metadata = await metascraper({ html, url: baseUrl });

      // test query string only
      let reg = new RegExp(`(\\b${INTERN_KEYWORDS.join("\\b|\\b")}\\b)`);
      let urlTest = reg.test(url.toLowerCase());
      let descTest = reg.test(
        metadata.description ? metadata.description.toLowerCase() : ""
      );
      let bodyTest = reg.test(markup.paragraphs.join(" "));

      if ((urlTest || descTest) && bodyTest) {
        links.stored.push({ baseUrl, url, ...metadata });
        log(`Stored ${url}`);
      }
    }

    return await scrapePage(page, baseUrl, links);
  } catch (err) {
    log(err);
  }
}

(async () => {
  try {
    const { browser, page } = await startBrowser();

    let urls = JSON.parse(fs.readFileSync("jobfair-companies-list.json"));

    // Test;
    // let u = "https://clover.studio";
    // await storeInfo(await scrapePage(page, (baseUrl = u)));

    let entries = [];
    for (let i = 0; i < urls.length; i++) {
      entries = [...entries, ...(await scrapePage(page, (baseUrl = urls[i])))];
    }
    await storeInfo(entries);

    await browser.close();
  } catch (err) {
    log(err);
    await browser.close();
  }
})();
