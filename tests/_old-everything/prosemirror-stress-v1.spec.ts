import { CDPSession, Page, test } from "@playwright/test";
import { findEditor, relevantMetrics } from "./utils";
import fs from "fs";
import path from "path";
import { Protocol } from "playwright-core/types/protocol";

// NOTES
// 6000 repeat (1000ms interval) 8 mins
// 3000 repeats (500ms) 1min40s

// how long do they run before getting jerky
const REPEATS = 9000000;
const MEASUREMENT_INTERVAL = 15000;
const filename = "stressPM.json";
let wordcount: number;

const perfArray: Protocol.Performance.Metric[] = [];
let page: Page;
let interval: NodeJS.Timeout;
let session: CDPSession;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await findEditor(page, "", "#editor");

  interval = setInterval(async () => {
    const performanceMetrics = await session.send("Performance.getMetrics");
    const perfMetricsFiltered = performanceMetrics.metrics.filter((metric) =>
      relevantMetrics.includes(metric.name),
    );
    perfArray.push(...perfMetricsFiltered);
  }, MEASUREMENT_INTERVAL);

  const time = new Date().toLocaleTimeString();
  console.log("PM test STARTS at", time);
});

test.afterAll(async () => {
  // await session.detach();
  clearInterval(interval);
  const folderPath = path.join(__dirname, "pm-results");

  const time = new Date().toLocaleTimeString();
  console.log("PM test ENDS at", time, "with the wordcount of", wordcount);

  fs.writeFile(
    path.join(folderPath, filename),
    JSON.stringify(perfArray),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`PM RESULTS are in: ${filename}`);
    },
  );

  await page.close();
});

test.only("PM stress test: infinite test with paragraphs", async () => {
  test.setTimeout(15000000);

  for (let i = 0; i < REPEATS; i++) {
    await page.keyboard.type("typing ");
    await page.keyboard.press("Enter");
    wordcount = i;
  }
});