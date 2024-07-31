import { test, expect } from "@playwright/test";

test.describe("ProseMirror editor performance tests", () => {
  test("measure editor initialization time", async ({ page }) => {
    await page.goto("http://localhost:3000/");

    // Assuming your ProseMirror editor renders after the #editor div becomes visible
    await expect(page.locator("#editor")).toBeVisible();

    const initializationTime = await page.evaluate(() => {
      const timing = window.performance.timing;
      return timing.domInteractive - timing.navigationStart;
    });

    console.log(`Prosemirror Initialization Time: ${initializationTime}ms`);
  });

  test("measure input latency", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await expect(page.locator("#editor")).toBeVisible();

    const startTime = Date.now();
    await page.click("#editor");
    await page.keyboard.type("Hello, World!");
    const latency = Date.now() - startTime;

    console.log(`Prosemirror Input Latency: ${latency}ms`);
  });

  test("measure memory usage", async ({ page }) => {
    await page.goto("http://localhost:3000/");

    // Note: Uncomment the following line if the browser is launched with the --expose-gc flag.
    // await page.evaluate(() => globalThis.gc());

    const memoryUsage = await page.evaluate(() => {
      // This is non-standard and may not be available in all browsers/environments
      // if (performance.memory || performance.) {
      //   return performance.memory.usedJSHeapSize;
      // }
      return null;
    });

    if (memoryUsage !== null) {
      console.log(`Prosemirror Memory Usage: ${memoryUsage} bytes`);
    } else {
      console.log(`Prosemirror Memory Usage: Measurement not available`);
    }
  });

  test("user interaction responsiveness", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await expect(page.locator("#editor")).toBeVisible();

    await page.click("#editor");

    const startTime = Date.now();
    // Perform some user interactions here
    await page.keyboard.type("This is a test.");
    const endTime = Date.now();

    const responsivenessTime = endTime - startTime;

    console.log(
      `Prosemirror User Interaction Responsiveness: ${responsivenessTime}ms`,
    );
  });

  test("typing performance at scale", async ({ page }) => {
    const largeText = "Lorem ipsum ".repeat(1000); // Creates a large block of text
    await page.goto("http://localhost:3000/");
    const editor = page.locator("#editor");
    await expect(editor).toBeVisible();

    // Simulate typing a large document
    await editor.type(largeText, { delay: 0 }); // 'delay: 0' for fast typing, adjust as needed

    // Now measure typing performance
    const startTime = performance.now();
    await editor.type("Test", { delay: 0 });
    const typingLatency = performance.now() - startTime;

    console.log(`Prosemirror Typing Performance at Scale: ${typingLatency}ms`);
  });

  test("undo/redo performance", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    const editor = page.locator("#editor");
    await expect(editor).toBeVisible();

    // Type something and then undo/redo it
    await editor.type("Hello, World!");
    const startTimeUndo = performance.now();
    await page.keyboard.press("Control+Z");
    const undoLatency = performance.now() - startTimeUndo;

    const startTimeRedo = performance.now();
    await page.keyboard.press("Control+Shift+Z"); // Or 'Control+Y' depending on the system
    const redoLatency = performance.now() - startTimeRedo;

    console.log(`Prosemirror Undo Performance: ${undoLatency}ms`);
    console.log(`Prosemirror Redo Performance: ${redoLatency}ms`);
  });

  test("scroll performance", async ({ page }) => {
    const largeText = "Lorem ipsum ".repeat(1000); // Creates a large block of text
    await page.goto("http://localhost:3000/");
    const editor = page.locator("#editor");
    await expect(editor).toBeVisible();

    // Simulate inserting a large document
    await editor.type(largeText, { delay: 0 });

    // Measure scroll performance
    await editor.evaluate((node) => (node.scrollTop = 0)); // Scroll to top first
    const startTimeScroll = performance.now();
    await editor.evaluate((node) => (node.scrollTop = node.scrollHeight));
    const scrollTime = performance.now() - startTimeScroll;

    console.log(`Prosemirror Scroll Performance: ${scrollTime}ms`);
  });

  test("paste operation", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    const editor = page.locator("#editor");
    await expect(editor).toBeVisible();

    // Simulate pasting a large block of text
    await page.evaluate(() => {
      const largeText = "Lorem ipsum ".repeat(1000); // Creates a large block of text
      navigator.clipboard.writeText(largeText);
    });

    const startTimePaste = performance.now();
    await editor.click().then(() => page.keyboard.press("Control+V"));
    const pasteTime = performance.now() - startTimePaste;

    console.log(`Prosemirror Paste Operation Time: ${pasteTime}ms`);
  });
});
