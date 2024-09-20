import { Page } from "@playwright/test";
import {
  GraphDataPoint,
  MetricNodeCountPair,
  Metric,
  TimeAtNodeCount,
  yDataset,
} from "./types";
import { folderPath, lexicalColors, pmColors } from "./constants";
// @ts-ignore
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const Chart = require("chart.js/auto");

export const findEditor = async (
  page: Page,
  editor: string,
  querySelector: string,
) => {
  await page.goto(`http://localhost:3000/${editor}`);
  await page.waitForSelector(querySelector);
  await page.click(querySelector);

  // to send the console messages from the browser to the CLI (if there's any)
  page.on("console", (consoleMessage) => {
    if (consoleMessage.type() === "error") return;
    console.log(
      `${
        editor === "prosemirror" ? "PM" : "Lexical"
      }, browser console: \n${consoleMessage.text()}`,
    );
  });
};

// Filters the performance data for each enabled metric and creates their own JSON file
export const filterMetric = ({
  filterFor,
  perfDataWithNodeCount,
  editor,
}: {
  filterFor: string;
  perfDataWithNodeCount: MetricNodeCountPair[];
  editor: string;
}) => {
  const filteredMetrics = perfDataWithNodeCount.map(
    (metricNodeCountPair: MetricNodeCountPair) => {
      const filteredMetric = metricNodeCountPair.metrics.filter(
        (metric: Metric) => {
          if (metric.name === filterFor) return metric.value;
        },
      );
      return {
        value: filteredMetric[0].value,
        nodeCount: metricNodeCountPair.nodeCount,
      };
    },
  );

  const fileName = `${editor}-${filterFor}.json`;

  fs.writeFile(
    path.join(folderPath, fileName),
    JSON.stringify(filteredMetrics),
    "utf8",
    (err: any) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`* File: ${filterFor}-nodeCount created for ${editor}`);
    },
  );
};

// If there's a measurement with the same nodeCount as in the nodeCount-time array,
// this function removes the item with the two 'null' values
const removeDuplicatesWithNullValues = (graphDataPoints: GraphDataPoint[]) => {
  const seenNodeCounts = new Set();

  return graphDataPoints.filter((item) => {
    const isDuplicate = seenNodeCounts.has(item.nodeCount);
    seenNodeCounts.add(item.nodeCount);

    // keep the item if it's not a duplicate or if either valueL or valuePM is not null
    return !(isDuplicate && item.valueL === null && item.valuePM === null);
  });
};

// Helper function for processing the performance data for the graph
// and converts the JSHeapUsedSize unit from bytes to MB
const processDataHelper = (
  perfData: MetricNodeCountPair[],
  valueKey: "valueL" | "valuePM",
  filterFor: string,
  graphDataPoints: GraphDataPoint[],
) => {
  const convertToMB = (v: number | undefined) => {
    if (v && filterFor === "JSHeapUsedSize") {
      return v / 1048576;
    }
    return v;
  };

  perfData.forEach((metricNodeCountPair: MetricNodeCountPair) => {
    const metric = metricNodeCountPair.metrics.find(
      (m: Metric) => m.name === filterFor,
    );

    graphDataPoints.push({
      nodeCount: metricNodeCountPair.nodeCount,
      valueL: valueKey === "valueL" ? convertToMB(metric?.value) || null : null,
      valuePM:
        valueKey === "valuePM" ? convertToMB(metric?.value) || null : null,
    });
  });
};

// Processes the test results for the graph, whether you want to compare editors or just see one metric for one editor
export const processDataForGraph = ({
  filterFor,
  perfMetricsLexical,
  perfMetricsPM,
  timeAtNodeCountResult,
}: {
  filterFor: string;
  perfMetricsLexical: MetricNodeCountPair[] | null;
  perfMetricsPM: MetricNodeCountPair[] | null;
  timeAtNodeCountResult: TimeAtNodeCount[] | null;
}) => {
  const graphDataPoints: GraphDataPoint[] = [];

  if (perfMetricsLexical)
    processDataHelper(perfMetricsLexical, "valueL", filterFor, graphDataPoints);
  if (perfMetricsPM)
    processDataHelper(perfMetricsPM, "valuePM", filterFor, graphDataPoints);

  if (timeAtNodeCountResult)
    timeAtNodeCountResult.forEach(({ nodeCount }) => {
      graphDataPoints.push({ nodeCount, valueL: null, valuePM: null });
    });

  return removeDuplicatesWithNullValues(
    graphDataPoints.sort((a, b) => a.nodeCount - b.nodeCount),
  );
};

const createDataset = (
  label: string,
  data: Array<number | null>,
  colors: { backgroundColor: string; borderColor: string },
): yDataset => ({
  label,
  data,
  backgroundColor: colors.backgroundColor,
  pointRadius: 2,
  borderColor: colors.borderColor,
  borderWidth: 1,
  spanGaps: true,
});

export const createGraph = ({
  xDataset,
  lexicalDataset,
  pmDataset,
  metric,
  fileName,
}: {
  xDataset: number[];
  lexicalDataset: Array<number | null>;
  pmDataset: Array<number | null>;
  metric: string;
  fileName?: string;
}) => {
  const dom = new JSDOM(
    '<!DOCTYPE html><html lang="eng"><body><canvas id="graph" width="800" height="400"></canvas></body></html>',
  );
  global.window = dom.window;
  global.document = dom.window.document;

  // Get the canvas element from the virtual DOM
  const canvas = dom.window.document.getElementById("graph");
  const ctx = canvas.getContext("2d");

  let datasets: yDataset[] = [];

  if (lexicalDataset.some((v) => v !== null)) {
    datasets.push(createDataset("Lexical", lexicalDataset, lexicalColors));
  }

  if (pmDataset.some((v) => v !== null)) {
    datasets.push(createDataset("ProseMirror", pmDataset, pmColors));
  }

  // Create the graph
  new Chart(ctx, {
    type: "line",
    data: {
      labels: xDataset,
      datasets: datasets,
    },
    options: {
      responsive: false,
      scales: {
        x: {
          beginAtZero: true,
          display: true,
          title: {
            display: true,
            text: "nodeCount",
          },
        },
        y: {
          beginAtZero: true,
          display: true,
          title: {
            display: true,
            text: metric,
          },
        },
      },
    },
  });
  const givenFileName = fileName ? fileName : metric;
  const base64Data = canvas.toDataURL().replace(/^data:image\/png;base64,/, "");
  fs.writeFileSync(
    path.join(folderPath, `${givenFileName}.png`),
    base64Data,
    "base64",
  );

  console.log(`* Graph: ${givenFileName}-nodeCount created`);
};