import { expect, test } from "@playwright/test";
import { averageOf, findEditor, pasteText, selectText } from "./utils";

test.describe("Lexical editor performance tests", () => {
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

  test("measure input latency", async ({ page }) => {
    await findEditor(page);
    const perfTimes = [];

    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      await page.keyboard.type("Hello, World!");
      const latency = Date.now() - startTime;
      perfTimes.push(latency);
    }

    console.log(averageOf(perfTimes));
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
    await findEditor(page);

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
    await findEditor(page);

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
    await findEditor(page);

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
    await findEditor(page);
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
    const perfTimes = [];

    for (let i = 0; i < 20; i++) {
      const pasteTime = await pasteText(page, 10000);
      perfTimes.push(pasteTime);
    }
    console.log(
      `Lexical Average Paste Operation Time: ${averageOf(perfTimes)}ms`,
    );
  });
});

/////

test("measure text selection performance", async ({ page, browser }) => {
  await browser.startTracing(page, {
    path: "./trace.json",
    screenshots: true,
  });

  await findEditor(page);
  await pasteText(page, 10000);

  const selectionDurations = await page.evaluate((selectTextFn) => {
    const perfTimes: number[] = [];

    const selectTextFunction = new Function("return " + selectTextFn)();

    const editor = document.querySelector(".ContentEditable__root");
    if (!editor) {
      console.warn("No contentEditableRoot found.");
      return perfTimes;
    }

    for (let i = 0; i < 20; i++) {
      performance.mark("start-selection");
      selectTextFunction(editor);
      performance.mark("end-selection");

      performance.measure("text-selection", "start-selection", "end-selection");
      const measure = performance.getEntriesByName("text-selection").pop();
      performance.clearMarks();
      performance.clearMeasures();
      if (!measure) return [];
      perfTimes.push(measure.duration);
    }

    return perfTimes;
  }, selectText.toString());

  await browser.stopTracing();
  console.log(`Average Selection Duration: ${averageOf(selectionDurations)}ms`);
});

test.only("measure formatting text performance", async ({ page, browser }) => {
  await browser.startTracing(page, {
    path: "./trace.json",
    screenshots: true,
  });

  await findEditor(page);

  const formatTextDuration = await page.evaluate((selectTextFn) => {
    const editor = document.querySelector(".ContentEditable__root");
    if (!editor) return [];
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "Lorem ipsum ".repeat(2);
    // editor.innerHTML = "";
    // editor.appendChild(paragraph);

    const perfTimes = [];

    const selectTextFunction = new Function("return " + selectTextFn)();
    selectTextFunction(editor);

    for (let i = 0; i < 20; i++) {
      editor.innerHTML = "";
      editor.appendChild(paragraph);
      performance.mark("start-formatting");
      const boldButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "B") as HTMLElement | null;
      if (!boldButton) return [];
      const clickEvent = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: false,
      });
      boldButton.dispatchEvent(clickEvent);
      performance.mark("end-formatting");

      performance.measure(
        "text-formatting",
        "start-formatting",
        "end-formatting",
      );
      const measure = performance.getEntriesByName("text-formatting").pop();
      performance.clearMarks();
      performance.clearMeasures();
      if (!measure) return [];
      perfTimes.push(measure.duration);
    }

    const isBoldApplied = editor.innerHTML.includes("<strong>");
    console.log("Is bold applied:", isBoldApplied);

    return perfTimes;
  }, selectText.toString());

  await page.waitForTimeout(2000);

  await browser.stopTracing();
  console.log(
    `Average Text Formatting Duration: ${averageOf(formatTextDuration)}ms`,
  );
});

test("measure list magic performance", async ({ page, browser }) => {
  await browser.startTracing(page, {
    path: "../tests/trace.json",
    screenshots: true,
  });

  await findEditor(page);

  const bulletList = await page.evaluate((selectTextFn) => {
    const createTimes = [];
    const addingTimes = [];
    const modifyingTimes = [];

    const editor = document.querySelector(".ContentEditable__root");
    if (!editor)
      return { createTimes: [], addingTimes: [], modifyingTimes: [] };
    const originalList = new Array(3).fill("Lorem ipsum ");
    const selectTextFunction = new Function("return " + selectTextFn)();
    editor.textContent = originalList.join("\n");

    // creating a bulletList
    for (let i = 0; i < 20; i++) {
      performance.mark("start-creating");
      selectTextFunction(editor);

      const bulletListButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "ul") as HTMLElement | null;
      if (!bulletListButton)
        return {
          createTimes: [],
          addingTimes: [],
          modifyingTimes: [],
        };
      // TODO: not working
      bulletListButton.click();

      performance.mark("end-creating");

      performance.measure("creating-list", "start-creating", "end-creating");
      const measureListCreating = performance
        .getEntriesByName("creating-list")
        .pop();
      if (!measureListCreating)
        return {
          createTimes: [],
          addingTimes: [],
          modifyingTimes: [],
        };
      createTimes.push(measureListCreating.duration);
    }
    console.log(editor.outerHTML);

    // adding items to the bulletList
    for (let i = 0; i < 20; i++) {
      const newList = new Array(3).fill("Lorem ipsum2 ");

      performance.mark("start-adding");
      for (let j = 0; j < newList.length; j++) {
        editor.textContent += `\n ${newList[j]}`;
      }
      performance.mark("end-adding");
      if (i < 19) {
        editor.textContent = originalList.join("\n");
      }

      performance.measure("adding-to-list", "start-adding", "end-adding");
      const measureListAdding = performance
        .getEntriesByName("adding-to-list")
        .pop();
      if (!measureListAdding)
        return {
          createTimes: [],
          addingTimes: [1, 1, 1],
          modifyingTimes: [],
        };
      addingTimes.push(measureListAdding.duration);
    }

    // modifying items on the bulletList
    for (let i = 0; i < 4; i++) {
      performance.mark("start-modifying");
      // for (let m = 0; m < editor.textContent.length; m++) {
      //   if (editor.textContent[m].includes("Lorem ipsum")) {
      //     editor.textContent = editor.textContent[m].replace(
      //       "Lorem ipsum",
      //       "Lorem ipsum3",
      //     );
      //   }
      // }
      performance.mark("end-modifying");

      performance.measure("modifying-list", "start-modifying", "end-modifying");
      const measureListModifying = performance
        .getEntriesByName("modifying-list")
        .pop();
      if (!measureListModifying)
        return {
          createTimes: [],
          addingTimes: [],
          modifyingTimes: [2, 2, 2],
        };
      modifyingTimes.push(measureListModifying.duration);
    }
    return { createTimes, addingTimes, modifyingTimes };
  }, selectText.toString());

  await browser.stopTracing();
  const { createTimes, addingTimes, modifyingTimes } = bulletList;
  console.log("so this is createTimes", averageOf(createTimes));
  console.log("so this is addingTimes", averageOf(addingTimes));
  console.log("so this is Christmas", averageOf(modifyingTimes));
});

// test.only("measure formatting text performance", async ({ page, browser }) => {
//   await browser.startTracing(page, {
//     path: "./trace.json",
//     screenshots: true,
//   });
//
//   await loadAndClick(page);
//
//
//
//   await browser.stopTracing();
// });
