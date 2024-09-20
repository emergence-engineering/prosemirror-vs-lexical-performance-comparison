import { Page, test, CDPSession } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  findEditor,
  createGraph,
  filterMetric,
  processDataForGraph,
} from "./utils";
import {
  folderPath,
  lexicalParams,
  prosemirrorParams,
  perfMetricsL,
  perfMetricsPM,
  savedNodeCountsL,
  savedNodeCountsPM,
  MEASUREMENT_INTERVAL,
  MAX_NODES,
  NODECOUNT_CHECKPOINT,
  metrics,
} from "./constants";
import { EditorParams } from "./types";

let page: Page;
let session: CDPSession;

let activeEditor: EditorParams;
let nodeCount: number = 0;
let metricInterval: NodeJS.Timeout;

test.beforeEach(async ({ browser }) => {
  page = await browser.newPage();
  session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");

  // set an interval to read the selected metrics in every MEASUREMENT_INTERVAL
  metricInterval = setInterval(async () => {
    const perfMetrics = await session.send("Performance.getMetrics");
    const filteredPerfMetrics = perfMetrics.metrics.filter((metric) =>
      metrics.includes(metric.name),
    );
    activeEditor.perfMetrics.push({ metrics: filteredPerfMetrics, nodeCount });
  }, MEASUREMENT_INTERVAL);

  nodeCount = 0;
});

test.afterEach(async () => {
  const time = new Date().toLocaleTimeString();
  console.log(
    `${activeEditor.name} test ENDS at`,
    time,
    "with the nodecount of",
    nodeCount,
  );

  clearInterval(metricInterval);

  //* do you need a JSON file of nodeCount-time pairs?
  fs.writeFile(
    path.join(folderPath, activeEditor.nodeCountFileName),
    JSON.stringify(activeEditor.nodeCountMetrics),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(
        `* Result: ${activeEditor.name} nodeCount is in: results/${activeEditor.nodeCountFileName}`,
      );
    },
  );
  // */

  //* do you need a JSON file of the enabled metrics with the current nodecount, measured at each MEASUREMENT_INTERVAL?
  fs.writeFile(
    path.join(folderPath, activeEditor.perfMetricsFileName),
    JSON.stringify(activeEditor.perfMetrics),
    "utf8",
    (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(
        `* Result: ${activeEditor.name} performance test is in: results/${activeEditor.perfMetricsFileName}`,
      );
    },
  );
  // */

  //* do you need JSON files of each enabled metric with the current nodecount?
  const performanceMetrics =
    activeEditor.name === "Lexical" ? perfMetricsL : perfMetricsPM;

  metrics.forEach((m) => {
    filterMetric({
      filterFor: m,
      perfDataWithNodeCount: performanceMetrics,
      editor: activeEditor.name,
    });
  });
  // */

  //* do you need nodeCount(x)-metric(y) graphs for each editor separately?
  metrics.forEach((m) => {
    const data = processDataForGraph({
      filterFor: m,
      perfMetricsLexical: activeEditor.name === "Lexical" ? perfMetricsL : null,
      perfMetricsPM: activeEditor.name === "Lexical" ? null : perfMetricsPM,
      timeAtNodeCountResult:
        activeEditor.name === "Lexical" ? savedNodeCountsL : savedNodeCountsPM,
    });

    createGraph({
      xDataset: data.map((d) => d.nodeCount),
      lexicalDataset: data.map((d) => d.valueL),
      pmDataset: data.map((d) => d.valuePM),
      metric: m,
      fileName: `${activeEditor.name}-${m}`,
    });
  });
  // */
});

test.afterAll(async () => {
  //* do you need nodecount(x)-metric(y) graphs comparing the two editors?
  metrics.forEach((m) => {
    const data = processDataForGraph({
      filterFor: m,
      perfMetricsLexical: perfMetricsL,
      perfMetricsPM: perfMetricsPM,
      timeAtNodeCountResult: savedNodeCountsL,
    });

    createGraph({
      xDataset: data.map((d) => d.nodeCount),
      lexicalDataset: data.map((d) => d.valueL),
      pmDataset: data.map((d) => d.valuePM),
      metric: m,
    });
  });
  // */

  //* do you need a nodecount(x)-time(y) graph comparing the two editors?
  createGraph({
    xDataset: savedNodeCountsL.map((d) => d.nodeCount),
    lexicalDataset: savedNodeCountsL.map((d) => d.time),
    pmDataset: savedNodeCountsPM.map((d) => d.time),
    metric: "Time",
  });
  // */

  await page.close();
});

async function runStressTest({
  editorName,
  editor,
  page,
  querySelector,
}: {
  editorName: string;
  editor: string;
  page: Page;
  querySelector: string;
}) {
  await findEditor(page, editor, querySelector);

  const time = new Date().toLocaleTimeString();
  console.log(`\n***********\n${editorName} test STARTS at`, time);

  // the test itself just types a word and hits enter in a loop
  for (let i = 0; i < MAX_NODES; i++) {
    await page.keyboard.type("typing ");
    await page.keyboard.press("Enter");
    nodeCount = i + 1;

    if (nodeCount % NODECOUNT_CHECKPOINT === 0 || nodeCount === 1) {
      activeEditor.nodeCountMetrics.push({
        nodeCount: nodeCount,
        time: performance.now(),
      });
    }
  }
}

test(`Lexical stress test: infinite nodes`, async () => {
  activeEditor = lexicalParams;

  await runStressTest({
    editorName: activeEditor.name,
    editor: activeEditor.editor,
    page: page,
    querySelector: activeEditor.querySelector,
  });
});

test(`ProseMirror stress test: infinite nodes`, async () => {
  activeEditor = prosemirrorParams;

  await runStressTest({
    editorName: activeEditor.name,
    editor: activeEditor.editor,
    page: page,
    querySelector: activeEditor.querySelector,
  });
});