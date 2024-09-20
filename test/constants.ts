import path from "path";
import { EditorParams, MetricsAtNodeCount, TimeAtNodeCount } from "./types";

export const MEASUREMENT_INTERVAL = 15000; // how often the code saves the metrics you measure - default is 15 sec

export const MAX_NODES = 20000; // how many nodes to insert into the editor - default is 20k to make sure the test doesn't finish before the set timeout

export const NODECOUNT_CHECKPOINT = 200; // the node count at which you want to save the time-nodeCount pair - default is 200

export const TIMEOUT = 3600000; // how long the test would run - default is 1 hour

export const GLOBALTIMEOUT = 4200000; // how long the test would run WITH the before/after hooks included - default is 70 mins

// Select the performance metrics you are interested in
export const metrics = [
  // "JSEventListeners",
  // "LayoutObjects",
  // "Nodes",
  // "Resources",
  "LayoutCount",
  // "RecalcStyleCount",
  // "LayoutDuration",
  // "RecalcStyleDuration",
  "ScriptDuration",
  // "TaskDuration",
  // "ThreadTime",
  // "ProcessTime",
  "JSHeapUsedSize",
  // "JSHeapTotalSize",
];

export const folderPath = path.join(__dirname, "results");

export const perfMetricsL: MetricsAtNodeCount[] = [];
export const perfMetricsPM: MetricsAtNodeCount[] = [];
export const savedNodeCountsL: TimeAtNodeCount[] = [];
export const savedNodeCountsPM: TimeAtNodeCount[] = [];

export const lexicalParams: EditorParams = {
  name: "Lexical",
  editor: "lexical",
  querySelector: ".ContentEditable__root",
  nodeCountFileName: "L-nodecount.json",
  perfMetricsFileName: "L-perfMetrics.json",
  perfMetrics: perfMetricsL,
  nodeCountMetrics: savedNodeCountsL,
};

export const prosemirrorParams: EditorParams = {
  name: "ProseMirror",
  editor: "prosemirror",
  querySelector: "#editor",
  nodeCountFileName: "PM-nodecount.json",
  perfMetricsFileName: "PM-perfMetrics.json",
  perfMetrics: perfMetricsPM,
  nodeCountMetrics: savedNodeCountsPM,
};

export const lexicalColors = {
  backgroundColor: "rgba(65,133,244, 1)",
  borderColor: "rgba(65,133,244, 0.8)",
};
export const pmColors = {
  backgroundColor: "rgba(234,67,53, 1)",
  borderColor: "rgba(234,67,53, 0.8)",
};