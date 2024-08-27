import { Page, test, CDPSession } from "@playwright/test";
import { findEditor, relevantMetrics } from "./utils";
import fs from "fs";
import path from "path";
import { Protocol } from "playwright-core/types/protocol";

const MEASUREMENT_INTERVAL = 15000;
const REPEATS = 90000;

const folderPath = path.join(__dirname, "pm-results");
const nodeCountFilename = "PM-nodecount.json";
const filename = "PM-stress.json";

let nodeCount: number;
const nodeCountMetrics: number[] = [];
let nodecountInterval: NodeJS.Timeout;
let page: Page;

const performanceMetrics: Protocol.Performance.Metric[] = [];
let metricInterval: NodeJS.Timeout;
let session: CDPSession;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await findEditor(page, "", "#editor");

  nodecountInterval = setInterval(async () => {
    nodeCountMetrics.push(nodeCount);
  }, MEASUREMENT_INTERVAL);

  metricInterval = setInterval(async () => {
    const perfMetrics = await session.send("Performance.getMetrics");
    const filteredPerfMetrics = perfMetrics.metrics.filter((metric) =>
      relevantMetrics.includes(metric.name),
    );
    performanceMetrics.push(...filteredPerfMetrics);
  }, MEASUREMENT_INTERVAL);

  const time = new Date().toLocaleTimeString();
  console.log("* PM test STARTS at", time);
});

test.afterAll(async () => {
  const time = new Date().toLocaleTimeString();
  console.log("* PM test ENDS at", time, "with the nodecount of", nodeCount);

  clearInterval(metricInterval);
  clearInterval(nodecountInterval);

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

  fs.writeFile(
    path.join(folderPath, filename),
    JSON.stringify(performanceMetrics),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`** Lexical CDP results are in: ${filename}`);
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