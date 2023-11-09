import { test, expect, Page } from "@playwright/test";

async function loadAndClick(page: Page) {
  await page.goto("http://localhost:3000/lexical");
  await page.click(".ContentEditable__root");
}

const averageOf = (perfTime: number[]) => {
  return perfTime.reduce((a, b) => a + b, 0) / perfTime.length;
};

test.describe("Lexical editor performance tests", () => {
  test("measure editor initialization time", async ({ page }) => {
    await page.goto("http://localhost:3000/lexical");
    await expect(page.locator(".ContentEditable__root")).toBeVisible();

    const initializationTime = await page.evaluate(() => {
      const timing = window.performance.timing;
      return timing.domInteractive - timing.navigationStart;
    });

    console.log(`Lexical Initialization Time: ${initializationTime}ms`);
  });

  test("measure input latency", async ({ page }) => {
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

  test("user interaction responsiveness", async ({ page }) => {
    await loadAndClick(page);

    const startTime = Date.now();
    // Perform some user interactions here
    await page.keyboard.type("This is a test.");
    const endTime = Date.now();

    const responsivenessTime = endTime - startTime;

    console.log(
      `Lexical User Interaction Responsiveness: ${responsivenessTime}ms`,
    );
  });

  test("typing performance at scale", async ({ page }) => {
    test.setTimeout(60000);
    const largeText = "Lorem ipsum ".repeat(1000); // Creates a large block of text
    await loadAndClick(page);

    const editor = page.locator("div[contenteditable='true']");

    await page.keyboard.type(largeText, { delay: 0 }); // 'delay: 0' for fast typing, adjust as needed

    // Now measure typing performance
    const startTime = performance.now();
    await editor.type("Test", { delay: 0 });
    const typingLatency = performance.now() - startTime;

    console.log(`Lexical Typing Performance at Scale: ${typingLatency}ms`);
  });

  test("undo/redo performance", async ({ page }) => {
    test.setTimeout(60000);
    const editor = page.locator("div[contenteditable='true']");
    await loadAndClick(page);

    await editor.type("Hello, World!");
    const startTimeUndo = performance.now();
    await page.keyboard.press("Control+Z");
    const undoLatency = performance.now() - startTimeUndo;

    const startTimeRedo = performance.now();
    await page.keyboard.press("Control+Shift+Z"); // Or 'Control+Y' depending on the system
    const redoLatency = performance.now() - startTimeRedo;

    console.log(`Lexical Undo Performance: ${undoLatency}ms`);
    console.log(`Lexical Redo Performance: ${redoLatency}ms`);
  });

  test("scroll performance", async ({ page }) => {
    test.setTimeout(60000);
    const largeText = "Lorem ipsum ".repeat(1000); // Creates a large block of text
    await loadAndClick(page);
    const editor = page.locator("div[contenteditable='true']");

    await page.keyboard.type(largeText, { delay: 0 }); // 'delay: 0' for fast typing, adjust as needed

    // Measure scroll performance
    await editor.evaluate((node) => (node.scrollTop = 0)); // Scroll to top first
    const startTimeScroll = performance.now();
    await editor.evaluate((node) => (node.scrollTop = node.scrollHeight));
    const scrollTime = performance.now() - startTimeScroll;

    console.log(`Lexical Scroll Performance: ${scrollTime}ms`);
  });

  test("paste operation", async ({ page }) => {
    await page.goto("http://localhost:3000/lexical");
    const editor = page.locator("div[contenteditable='true']");
    await expect(editor).toBeVisible();

    // Simulate pasting a large block of text
    await page.evaluate(() => {
      const largeText = "Lorem ipsum ".repeat(1000); // Creates a large block of text
      navigator.clipboard.writeText(largeText);
    });

    const startTimePaste = performance.now();
    await editor.click();
    await page.keyboard.press("Control+V"); // Or 'Command+V' for macOS

    const pasteTime = performance.now() - startTimePaste;
    console.log(`Lexical Paste Operation Time: ${pasteTime}ms`);
  });
});
