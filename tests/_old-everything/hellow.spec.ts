import { test, Page } from "@playwright/test";
import type {
  PerformanceOptions,
  PlaywrightPerformance,
  PerformanceWorker,
} from "playwright-performance";
import { playwrightPerformance } from "playwright-performance";

async function loadAndClick(page: Page) {
  await page.goto("http://localhost:3000/lexical");
  await page.click(".ContentEditable__root");
}

const averageOf = (perfTime: number[]) => {
  return perfTime.reduce((a, b) => a + b, 0) / perfTime.length;
};

test.describe("Lexical editor performance tests original", () => {
  test("measure input latency - original", async ({ page }) => {
    await loadAndClick(page);
    const perfArr = [];

    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      await page.keyboard.type("Hello, World!");
      const latency = Date.now() - startTime;
      perfArr.push(latency);
    }

    console.log(averageOf(perfArr));
  });

  test("measure input latency - with save, chromium only", async ({
    page,
    browser,
  }) => {
    console.log("\n==== Devtools: startTracing ====\n");
    await browser.startTracing(page, {
      path: "./trace.json",
      screenshots: true,
    });

    await page.goto("http://localhost:3000/lexical");

    //Use performance.mark API
    await page.evaluate(() => window.performance.mark("perf:start"));

    await page.click(".ContentEditable__root");
    await page.keyboard.type("Hello, World!");

    //Performance.mark API
    await page.evaluate(() => window.performance.mark("perf:stop"));

    //Performance.measure API
    await page.evaluate(() =>
      window.performance.measure("overall", "perf:start", "perf:stop"),
    );

    //Get All Performance Marks Including Google's
    const getAllMarksJson = await page.evaluate(() =>
      JSON.stringify(window.performance.getEntriesByType("mark")),
    );
    const getAllMarks = JSON.parse(getAllMarksJson);
    console.log('window.performance.getEntriesByType("mark")', getAllMarks);

    //Get All Performance Measures Including Google's
    const getAllMeasuresJson = await page.evaluate(() =>
      JSON.stringify(window.performance.getEntriesByType("measure")),
    );
    const getAllMeasures = JSON.parse(getAllMeasuresJson);
    console.log(
      'window.performance.getEntriesByType("measure")',
      getAllMeasures,
    );

    console.log("\n==== Devtools: stopTracing ====\n");
    await browser.stopTracing();
  });

  const { writeFile } = require("fs").promises; // Require the writeFile method from fs.promises
  test.only("measure input latency - with save, xbrowser", async ({ page }) => {
    await page.goto("http://localhost:3000/lexical");

    await page.evaluate(() => performance.mark("perf:start"));
    await page.click(".ContentEditable__root");
    await page.keyboard.type("Hello, World!");
    await page.evaluate(() => performance.mark("perf:stop"));

    await page.evaluate(() =>
      performance.measure("overall", "perf:start", "perf:stop"),
    );

    // Get All Performance Marks Including Browser's
    const getAllMarks = await page.evaluate(() =>
      JSON.stringify(performance.getEntriesByType("mark")),
    );
    console.log("Performance Marks:", getAllMarks);

    // Get All Performance Measures Including Browser's
    const getAllMeasures = await page.evaluate(() =>
      JSON.stringify(performance.getEntriesByType("measure")),
    );
    console.log("Performance Measures:", getAllMeasures);

    await writeFile("./performance-marks.json", getAllMarks);
    await writeFile("./performance-measures.json", getAllMeasures);
  });

  test.extend<PlaywrightPerformance, PerformanceOptions & PerformanceWorker>({
    performance: playwrightPerformance.performance,
    performanceOptions: [{ analyzeByBrowser: true }, { scope: "worker" }],
    worker: [playwrightPerformance.worker, { scope: "worker", auto: true }],
  })("measure input latency - Perf.Package", async ({ page, performance }) => {
    await loadAndClick(page);
    performance.sampleStart("input latency");
    await page.keyboard.type("Hello, World!");
    performance.sampleEnd("input latency");
  });

  test("measure input latency - stamps", async ({ page }) => {
    await loadAndClick(page);

    const perfArr: number[] = [];

    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => performance.mark("typing-start"));
      await page.keyboard.type("Hello, World!");
      await page.evaluate(() => performance.mark("typing-end"));

      perfArr.push(
        await page.evaluate(() => {
          performance.measure("input-latency", "typing-start", "typing-end");
          const measure = performance.getEntriesByName("input-latency")[0];
          return measure.duration;
        }),
      );
    }
    console.log(averageOf(perfArr));
  });

  test("measure input latency - perf.now()", async ({ page }) => {
    await loadAndClick(page);
    const perfArr: number[] = [];
    for (let i = 0; i < 10; i++) {
      const startTypeTime = await page.evaluate(() => performance.now());
      await page.keyboard.type("Hello, World!");
      const endTypeTime = await page.evaluate(() => performance.now());
      const latency = endTypeTime - startTypeTime;
      perfArr.push(parseInt(latency.toFixed(2)));
    }
    console.log(averageOf(perfArr));
  });
});
