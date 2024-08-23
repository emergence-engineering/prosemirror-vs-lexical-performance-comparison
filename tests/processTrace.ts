const fs = require("fs");

const inputFilePath = "./tests/L-trace.json";
const outputFilePath = "./tests/L-extr.json";
// const inputFilePath = "./tests/PM-trace.json";
// const outputFilePath = "./tests/PM-extr.json";

const interval = 1000 * 1000; // 1 second in microseconds

interface TraceEvent {
  cat: string;
  name: string;
  ts: number;
  dur?: number;
  tts?: number;
  args?: {
    data?: {
      jsHeapSizeUsed?: number;
    };
    name?: string;
  };
}

interface ExtractedData {
  scriptDurations: Array<number>;
  jsHeapSizes: Array<number>;
  layoutCounts: Array<number>;
  threadTimes: Array<number>;
}

function processTrace(traceData: { traceEvents: TraceEvent[] }): ExtractedData {
  const extractedData: ExtractedData = {
    scriptDurations: [],
    jsHeapSizes: [],
    layoutCounts: [],
    threadTimes: [],
  };

  const firstEvent = traceData.traceEvents.find(
    (event) => event.cat !== "__metadata",
  );
  const initialTimestamp = firstEvent?.ts;

  let cumulativeScriptDuration = 0;
  let cumulativeLayoutCount = 0;
  let cumulativeThreadTime = 0;
  let lastJsHeapSize = 0;

  let lastTimestamp = 0;

  traceData.traceEvents.forEach((event) => {
    const relativeTimestamp = event.ts - (initialTimestamp || 0);

    if (relativeTimestamp >= lastTimestamp + interval) {
      lastTimestamp += interval;

      // Store the cumulative data for the current interval
      extractedData.scriptDurations.push(cumulativeScriptDuration);

      extractedData.jsHeapSizes.push(lastJsHeapSize);

      extractedData.layoutCounts.push(cumulativeLayoutCount);

      extractedData.threadTimes.push(cumulativeThreadTime);
    }

    if (event.cat === "v8.execute" && event.dur) {
      cumulativeScriptDuration += event.dur;
    }
    if (event.name === "UpdateCounters" && event.args?.data?.jsHeapSizeUsed) {
      lastJsHeapSize = event.args.data.jsHeapSizeUsed;
    }

    const layoutEventNames = ["Layout", "UpdateLayerTree", "Paint"];
    if (layoutEventNames.includes(event.name)) {
      cumulativeLayoutCount += 1;
    }

    if (event.tts) {
      cumulativeThreadTime += event.tts;
    }
  });

  // Push the final interval's data
  extractedData.scriptDurations.push(cumulativeScriptDuration);

  extractedData.jsHeapSizes.push(lastJsHeapSize);

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
  const extractedData = processTrace(traceData);

  // Save the extracted data to a new JSON file
  fs.writeFile(
    outputFilePath,
    JSON.stringify(extractedData, null, 2),
    (err: any) => {
      if (err) {
        console.error("Error writing extracted data file:", err);
        return;
      }
      console.log("Extracted data saved to", outputFilePath);
    },
  );
});