import { chromium, Page, test, Browser } from "@playwright/test";
import { findEditor } from "../utils";
import fs from "fs";
import path from "path";

const MEASUREMENT_INTERVAL = 15000;
const REPEATS = 90000;

const nodeCountFilename = "PM-nodecount.json";
const profileFilename = "PM-trace.json";
let nodeCount: number;
const folderPath = path.join(__dirname, "pm-results");

const nodeCountMetrics: number[] = [];
let page: Page;
let browser: Browser;
let nodecountInterval: NodeJS.Timeout;

test.beforeAll(async () => {
  browser = await chromium.launch({
    args: ["--js-flags=--max-old-space-size=8192"],
  });
  page = await browser.newPage();

  await findEditor(page, "", "#editor");

  nodecountInterval = setInterval(async () => {
    nodeCountMetrics.push(nodeCount);
  }, MEASUREMENT_INTERVAL);

  const time = new Date().toLocaleTimeString();
  console.log("PM test STARTS at", time);

  await browser.startTracing(page, {
    categories: [
      // "v8.execute",
      "devtools.timeline",
      // "disabled-by-default-devtools.timeline",
    ],
    path: path.join(folderPath, profileFilename),
    screenshots: false,
  });
});

test.afterAll(async () => {
  const time = new Date().toLocaleTimeString();
  console.log("PM test ENDS at", time, "with the nodecount of", nodeCount);

  clearInterval(nodecountInterval);
  await browser.stopTracing();

  fs.writeFile(
    path.join(folderPath, nodeCountFilename),
    JSON.stringify(nodeCountMetrics),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`PM nodecount results are in: ${nodeCountFilename}`);
    },
  );

  await page.close();
});

test("PM stress test: infinite test with paragraphs", async () => {
  for (let i = 0; i < REPEATS; i++) {
    await page.keyboard.type("typing ");
    await page.keyboard.press("Enter");
    nodeCount = i + 1;
  }
});