const fs = require("fs");

const inputFilePath = "./results/L-trace.json";
const outputFilePath = "./results/L-processedTrace.json";
// const inputFilePath = "./results/PM-trace.json";
// const outputFilePath = "./results/PM-processedTrace.json";

// 1 * 1000 * 1000 => 1 second in microseconds
const interval = 3 * 1000 * 1000;

interface TraceEvent {
  cat: string;
  name: string;
  ts: number;
  dur?: number;
  tdur?: number;
  args?: {
    data?: {
      jsHeapSizeUsed?: number;
    };
    name?: string;
  };
}

interface ExtractedData {
  scriptDurations: Array<number>;
  jsHeapUsedSizes: Array<number>;
  layoutCounts: Array<number>;
  threadTimes: Array<number>;
}

function processTraceForV2(traceData: {
  traceEvents: TraceEvent[];
}): ExtractedData {
  const extractedData: ExtractedData = {
    scriptDurations: [],
    jsHeapUsedSizes: [],
    layoutCounts: [],
    threadTimes: [],
  };

  // find the 0 sec
  const firstEvent = traceData.traceEvents.find(
    (event) => event.cat !== "__metadata",
  );
  const initialTimestamp = firstEvent?.ts || 0;

  let cumulativeScriptDuration = 0;
  let cumulativeLayoutCount = 0;
  let cumulativeThreadTime = 0;
  let lastJsHeapSize = 0;

  let lastTimestamp = 0;

  traceData.traceEvents.forEach((event) => {
    const relativeTimestamp = event.ts - initialTimestamp;

    if (relativeTimestamp >= lastTimestamp + interval) {
      lastTimestamp += interval;

      // Store the cumulative data for the current interval
      extractedData.scriptDurations.push(cumulativeScriptDuration);

      extractedData.jsHeapUsedSizes.push(lastJsHeapSize);

      extractedData.layoutCounts.push(cumulativeLayoutCount);

      extractedData.threadTimes.push(cumulativeThreadTime);
    }

    // ScriptDuration
    const scriptDurationEventNames = [
      "FunctionCall",
      "EventDispatch",
      "RunMicrotasks",
      "MajorGC",
      "MinorGC",
    ];
    if (event.dur && scriptDurationEventNames.includes(event.name)) {
      cumulativeScriptDuration += event.dur;
    }

    // JSHeapUsedSize
    if (event.name === "UpdateCounters" && event.args?.data?.jsHeapSizeUsed) {
      lastJsHeapSize = event.args.data.jsHeapSizeUsed;
    }

    // const layoutEventNames = ["Layout", "UpdateLayerTree", "Paint"];
    if (event.name === "Layout") {
      cumulativeLayoutCount += 1;
    }

    if (event.name === "RunTask" && event.tdur) {
      cumulativeThreadTime += event.tdur;
    }
  });

  // Push the final interval's data
  extractedData.scriptDurations.push(cumulativeScriptDuration);

  extractedData.jsHeapUsedSizes.push(lastJsHeapSize);

  extractedData.layoutCounts.push(cumulativeLayoutCount);

  extractedData.threadTimes.push(cumulativeThreadTime);

  return extractedData;
}

// Read the trace.json file
fs.readFile(inputFilePath, "utf8", (err: any, data: any) => {
  if (err) {
    console.error("Error reading trace file:", err);
    return;
  }

  const traceData = JSON.parse(data) as { traceEvents: TraceEvent[] };
  const extractedData = processTraceForV2(traceData);

  // Save the extracted data to a new JSON file
  fs.writeFile(
    outputFilePath,
    JSON.stringify(extractedData, null, 2),
    (err: any) => {
      if (err) {
        console.error("Error writing extracted data file:", err);
        return;
      }
      console.log("** Extracted data saved to", outputFilePath, " **");
    },
  );
});