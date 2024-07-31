import { CDPSession, Page, test } from "@playwright/test";
import { findEditor, relevantMetrics } from "./utils";
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

const perfArray: Protocol.Performance.Metric[] = [];
let page: Page;
let interval: NodeJS.Timeout;
let session: CDPSession;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await findEditor(page, "lexical", ".ContentEditable__root");

  interval = setInterval(async () => {
    const performanceMetrics = await session.send("Performance.getMetrics");
    const perfMetricsFiltered = performanceMetrics.metrics.filter((metric) =>
      relevantMetrics.includes(metric.name),
    );
    perfArray.push(...perfMetricsFiltered);
  }, MEASUREMENT_INTERVAL);

  const time = new Date().toLocaleTimeString();
  console.log("L test STARTS at", time);
});

test.afterAll(async () => {
  // await session.detach();
  clearInterval(interval);

  const folderPath = path.join(__dirname, "lexical-results");
  const time = new Date().toLocaleTimeString();
  console.log("L test ENDS at", time, "with the wordcount of", wordcount);

  fs.writeFile(
    path.join(folderPath, filename),
    JSON.stringify(perfArray),
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
    wordcount = i;
  }
});

// WITH EVALUATE
// await page.evaluate(
//   async ({ REPEATS }: { REPEATS: number }) => {
//     const myp = "typing ".repeat(REPEATS).split(" ");
//
//     const logButton = document.querySelector(".logB") as HTMLElement | null;
//     if (!logButton || logButton.textContent !== "Log HTML") return [];
//
//     const enterButton = document.querySelector(
//       ".enterB",
//     ) as HTMLElement | null;
//     if (!enterButton || enterButton.textContent !== "Enter") return [];
//
//     for (let i = 0; i < REPEATS; i++) {
//       document.execCommand("insertText", false, `${myp[0]}`);
//       // enterButton.click();
//
//       if (i === REPEATS - 1) {
//         logButton.click();
//       }
//       // checking where am I
//       if (i % 10000 === 0) {
//         const time = new Date().toLocaleTimeString();
//         console.log(i, time);
//       }
//     }
//   },
//   { REPEATS },
// );