import { Page, test, CDPSession } from "@playwright/test";
import { findEditor } from "./utils";
import fs from "fs";
import path from "path";
import { Protocol } from "playwright-core/types/protocol";

const MEASUREMENT_INTERVAL = Number(process.env.MEASUREMENT_INTERVAL);
const REPEATS = Number(process.env.REPEATS);
const lexicalParams = {
  name: process.env.L_NAME as string,
  editor: process.env.L_EDITOR as string,
  qs: process.env.L_QUERYSELECTOR as string,
  nodeCountFilename: process.env.L_NODECOUNTFILENAME as string,
  testFilename: process.env.L_TESTFILENAME as string,
};
const prosemirrorParams = {
  name: process.env.PM_NAME as string,
  editor: process.env.PM_EDITOR as string,
  qs: process.env.PM_QUERYSELECTOR as string,
  nodeCountFilename: process.env.PM_NODECOUNTFILENAME as string,
  testFilename: process.env.PM_TESTFILENAME as string,
};
const folderPath = path.join(__dirname, "results");

///////// SETTINGS /////////
const activeEditor = lexicalParams;
// const activeEditor = prosemirrorParams;

const metrics = [
  "ScriptDuration",
  // "JSHeapUsedSize",
  // "LayoutCount",
  // "ThreadTime",
];
///////// SETTINGS /////////

let page: Page;

let nodeCount: number;
const nodeCountMetrics: number[] = [];
let nodeCountInterval: NodeJS.Timeout;

const performanceMetrics: Protocol.Performance.Metric[] = [];
let metricInterval: NodeJS.Timeout;
let session: CDPSession;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await findEditor(page, activeEditor.editor, activeEditor.qs);

  nodeCountInterval = setInterval(async () => {
    nodeCountMetrics.push(nodeCount);
  }, MEASUREMENT_INTERVAL);

  metricInterval = setInterval(async () => {
    const perfMetrics = await session.send("Performance.getMetrics");
    const filteredPerfMetrics = perfMetrics.metrics.filter((metric) =>
      metrics.includes(metric.name),
    );
    performanceMetrics.push(...filteredPerfMetrics);
  }, MEASUREMENT_INTERVAL);

  const time = new Date().toLocaleTimeString();
  console.log(`* ${activeEditor.name} test STARTS at`, time);
});

test.afterAll(async () => {
  const time = new Date().toLocaleTimeString();
  console.log(
    `* ${activeEditor.name} test ENDS at`,
    time,
    "with the nodecount of",
    nodeCount,
  );

  clearInterval(metricInterval);
  clearInterval(nodeCountInterval);

  fs.writeFile(
    path.join(folderPath, activeEditor.nodeCountFilename),
    JSON.stringify(nodeCountMetrics),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(
        `** ${activeEditor.name} nodecount results are in: ${activeEditor.nodeCountFilename}`,
      );
    },
  );

  fs.writeFile(
    path.join(folderPath, activeEditor.testFilename),
    JSON.stringify(performanceMetrics),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(
        `** ${activeEditor.name} CDP results are in: ${activeEditor.testFilename}`,
      );
    },
  );

  await page.close();
});

test(`${activeEditor.name} stress test: infinite nodes`, async () => {
  for (let i = 0; i < REPEATS; i++) {
    await page.keyboard.type("typing ");
    await page.keyboard.press("Enter");
    nodeCount = i + 1;
  }
});