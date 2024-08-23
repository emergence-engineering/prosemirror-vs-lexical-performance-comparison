import { CDPSession, Page, test } from "@playwright/test";
import { findEditor, relevantMetrics } from "../utils";
import fs from "fs";
import path from "path";
import { Protocol } from "playwright-core/types/protocol";

// NOTES
// 6000 repeat (1000ms interval) 10 mins
// 3000 repeat (500ms interval) 2mins

// how long do they run before getting jerky
const REPEATS = 90000;
const MEASUREMENT_INTERVAL = 15000;
const filename = "stressL.json";
let wordcount: number;

const performanceMetrics: Protocol.Performance.Metric[] = [];
let page: Page;
let metricInterval: NodeJS.Timeout;
let session: CDPSession;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await findEditor(page, "lexical", ".ContentEditable__root");

  metricInterval = setInterval(async () => {
    const perfMetrics = await session.send("Performance.getMetrics");
    const filteredPerfMetrics = perfMetrics.metrics.filter((metric) =>
      relevantMetrics.includes(metric.name),
    );
    performanceMetrics.push(...filteredPerfMetrics);
  }, MEASUREMENT_INTERVAL);

  const time = new Date().toLocaleTimeString();
  console.log("L test STARTS at", time);
});

test.afterAll(async () => {
  clearInterval(metricInterval);

  const folderPath = path.join(__dirname, "lexical-results");
  const time = new Date().toLocaleTimeString();
  console.log("L test ENDS at", time, "with the wordcount of", wordcount);

  fs.writeFile(
    path.join(folderPath, filename),
    JSON.stringify(performanceMetrics),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`Lexical RESULTS are in: ${filename}`);
    },
  );

  await page.close();
});

test("L stress test: infinite test with paragraphs", async () => {
  test.setTimeout(10000000);

  for (let i = 0; i < REPEATS; i++) {
    await page.keyboard.type("typing ");
    await page.keyboard.press("Enter");
    wordcount = i + 1;
  }
});