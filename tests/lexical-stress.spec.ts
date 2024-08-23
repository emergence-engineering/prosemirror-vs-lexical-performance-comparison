import { CDPSession, Page, test } from "@playwright/test";
import { findEditor, relevantMetrics } from "./utils";
import fs from "fs";
import path from "path";

export const MEASUREMENT_INTERVAL = 15000;
export const REPEATS = 90000;

const nodeCountFilename = "L-nodecount.json";
const profileFilename = "L-trace.json";
let nodeCount: number;

const nodeCountMetrics: number[] = [];
let page: Page;
let nodecountInterval: NodeJS.Timeout;
let session: CDPSession;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await findEditor(page, "lexical", ".ContentEditable__root");

  nodecountInterval = setInterval(async () => {
    nodeCountMetrics.push(nodeCount);
  }, MEASUREMENT_INTERVAL);

  const time = new Date().toLocaleTimeString();
  console.log("L test STARTS at", time);

  await browser.startTracing(page, {
    path: profileFilename,
    screenshots: true,
  });
});

test.afterAll(async ({ browser }) => {
  await browser.stopTracing().then(() => console.log("L-trace file is ready"));

  await page.evaluate(() => window.performance.mark("perf:stop"));
  clearInterval(nodecountInterval);

  const folderPath = path.join(__dirname, "lexical-results");
  const time = new Date().toLocaleTimeString();
  console.log("L test ENDS at", time, "with the nodecount of", nodeCount);

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
  test.setTimeout(60000);
  await page.evaluate(() => window.performance.mark("perf:start"));

  for (let i = 0; i < REPEATS; i++) {
    await page.keyboard.type("typing ");
    await page.keyboard.press("Enter");
    nodeCount = i + 1;
  }
});