import { expect, test } from "@playwright/test";
import {
  averageOf,
  createObserver,
  findEditor,
  pasteText,
  selectText,
  simulateCut,
  simulatePaste,
} from "./utils";

test.describe("Lexical - basic performance tests", () => {
  test.beforeEach(async ({ page }) => {
    await findEditor(page);
  });

  test("measure editor initialization time", async ({ page, browser }) => {
    await browser.startTracing(page, {
      path: "./trace.json",
      screenshots: true,
    });
    const perfTimes: number[] = [];
    for (let i = 0; i < 20; i++) {
      await page.goto("http://localhost:3000/lexical");
      await expect(page.locator(".ContentEditable__root")).toBeVisible();

      const initializationTime = await page.evaluate(() => {
        const navigationTiming = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        return navigationTiming.domInteractive - navigationTiming.startTime;
      });
      perfTimes.push(initializationTime);
    }
    await browser.stopTracing();

    console.log(
      `Lexical Average Initialization Time: ${averageOf(perfTimes)}ms`,
    );
  });

  /*
      test("measure memory usage", async ({ page }) => {
        await page.goto("http://localhost:3000/lexical");

        // Note: Uncomment the following line if the browser is launched with the --expose-gc flag.
        // await page.evaluate(() => globalThis.gc());

        const memoryUsage = await page.evaluate(() => {
          // This is non-standard and may not be available in all browsers/environments
          if (performance.memory) {
            return performance.memory.usedJSHeapSize;
          }
          return null;
        });

        if (memoryUsage !== null) {
          console.log(`Lexical Memory Usage: ${memoryUsage} bytes`);
        } else {
          console.log(`Lexical Memory Usage: Measurement not available`);
        }
      });
      //*/
});
