import { CDPSession, Page, test } from "@playwright/test";
import { findEditor, relevantMetrics } from "./utils";
import fs from "fs";
import path from "path";
import { Protocol } from "playwright-core/types/protocol";
import { MEASUREMENT_INTERVAL, REPEATS } from "./lexical-stress.spec";

const nodeCountFilename = "PM-nodecount.json";
const profileFilename = "PM-trace.json";
let nodeCount: number;

const nodeCountMetrics: number[] = [];
let page: Page;
let nodecountInterval: NodeJS.Timeout;
let session: CDPSession;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await findEditor(page, "", "#editor");

  nodecountInterval = setInterval(async () => {
    nodeCountMetrics.push(nodeCount);
  }, MEASUREMENT_INTERVAL);

  const time = new Date().toLocaleTimeString();
  console.log("PM test STARTS at", time);

  await browser.startTracing(page, {
    path: profileFilename,
    screenshots: true,
  });
});

test.afterAll(async ({ browser }) => {
  await browser.stopTracing().then(() => console.log("PM-trace file is ready"));

  await page.evaluate(() => window.performance.mark("perf:stop"));
  clearInterval(nodecountInterval);

  const folderPath = path.join(__dirname, "pm-results");

  const time = new Date().toLocaleTimeString();
  console.log("PM test ENDS at", time, "with the nodecount of", nodeCount);

  fs.writeFile(
    path.join(folderPath, nodeCountFilename),
    JSON.stringify(nodeCountMetrics),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`PM RESULTS are in: ${nodeCountFilename}`);
    },
  );

  await page.close();
});

test.only("PM stress test: infinite test with paragraphs", async () => {
  test.setTimeout(15000000);
  await page.evaluate(() => window.performance.mark("perf:start"));

  for (let i = 0; i < REPEATS; i++) {
    await page.keyboard.type("typing ");
    await page.keyboard.press("Enter");
    nodeCount = i + 1;
  }
});