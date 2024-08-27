import { Page, test, Browser, chromium } from "@playwright/test";
import { findEditor } from "./utils";
import fs from "fs";
import path from "path";

const MEASUREMENT_INTERVAL = 15000;
const REPEATS = 90000;

const folderPath = path.join(__dirname, "results");
const nodeCountFilename = "L-nodecount.json";
const profileFilename = "L-trace.json";

let nodeCount: number;
const nodeCountMetrics: number[] = [];
let nodecountInterval: NodeJS.Timeout;
let page: Page;
let browser: Browser;

test.beforeAll(async () => {
  browser = await chromium.launch({
    args: ["--js-flags=--max-old-space-size=8192"],
  });
  page = await browser.newPage();

  await findEditor(page, "lexical", ".ContentEditable__root");

  nodecountInterval = setInterval(async () => {
    nodeCountMetrics.push(nodeCount);
  }, MEASUREMENT_INTERVAL);

  const time = new Date().toLocaleTimeString();
  console.log("L test STARTS at", time);

  await browser.startTracing(page, {
    categories: [
      // "v8.execute",
      // "devtools.timeline",
      "disabled-by-default-devtools.timeline",
    ],
    path: path.join(folderPath, profileFilename),
    screenshots: false,
  });
});

test.afterAll(async () => {
  const time = new Date().toLocaleTimeString();
  console.log("L test ENDS at", time, "with the nodecount of", nodeCount);

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
      console.log(`Lexical nodecount results are in: ${nodeCountFilename}`);
    },
  );

  await page.close();
});

test("L stress test: infinite test with paragraphs", async () => {
  for (let i = 0; i < REPEATS; i++) {
    await page.keyboard.type("typing ");
    await page.keyboard.press("Enter");
    nodeCount = i + 1;
  }
});