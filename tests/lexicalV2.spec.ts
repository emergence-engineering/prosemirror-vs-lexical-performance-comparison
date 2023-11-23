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

test.describe("Lexical editor performance tests", () => {
  // test.beforeEach(async ({ page }) => {
  //   await page.goto("http://localhost:3000/lexical");
  //   await page.waitForSelector(".ContentEditable__root");
  //   await page.click(".ContentEditable__root");
  //   page.on("console", (consoleMessage) => {
  //     if (consoleMessage.type() === "error") return;
  //     console.log(`Browser console: \n${consoleMessage.text()}`);
  //   });
  // });

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

test("text selection performance", async ({ page, browser }) => {
  await browser.startTracing(page, {
    path: "./trace.json",
    screenshots: true,
  });

  await findEditor(page);

  const selectionDurations = await page.evaluate(
    ([simulatePasteFunction, selectTextFunction]) => {
      const perfTimes: number[] = [];

      const editor = document.querySelector(
        ".ContentEditable__root",
      ) as HTMLElement | null;
      if (!editor) return [];

      const simulatePasteFn = new Function("return " + simulatePasteFunction)();
      simulatePasteFn(
        "This is a test for selecting large text. ".repeat(1000),
        editor,
      );

      const selectTextFn = new Function("return " + selectTextFunction)();

      for (let i = 0; i < 1000; i++) {
        performance.mark("start-selection");
        setTimeout(() => {
          selectTextFn(editor);
        }, 0.5);
        performance.mark("end-selection");
        editor.click();

        performance.measure(
          "text-selection",
          "start-selection",
          "end-selection",
        );
        const measure = performance.getEntriesByName("text-selection").pop();
        performance.clearMarks();
        performance.clearMeasures();
        if (!measure) return [];
        perfTimes.push(measure.duration);
      }

      return perfTimes;
    },
    [simulatePaste.toString(), selectText.toString()],
  );

  await browser.stopTracing();
  console.log(`Average Selection Duration: ${averageOf(selectionDurations)}ms`);
});

test("formatting text performance", async ({ page, browser }) => {
  await browser.startTracing(page, {
    path: "./trace.json",
    screenshots: true,
  });

  await findEditor(page);

  const formatTextDuration = await page.evaluate(
    ([selectTextFunction, simulatePasteFunction, createObserverFunction]) => {
      const perfTimes = [];

      const editor = document.querySelector(
        ".ContentEditable__root",
      ) as HTMLElement | null;
      if (!editor) return [];

      const simulatePasteFn = new Function("return " + simulatePasteFunction)();
      simulatePasteFn(
        "This is a test for formatting large text. ".repeat(1000),
        editor,
      );
      const selectTextFn = new Function("return " + selectTextFunction)();
      setTimeout(() => {
        selectTextFn(editor);
      }, 0.5);
      const createObserverFn = new Function(
        "return " + createObserverFunction,
      )();

      const boldButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "B") as HTMLElement | null;
      if (!boldButton) return [];

      const observer = createObserverFn("strong", "end-formatting");

      for (let i = 0; i < 1000; i++) {
        performance.mark("start-formatting");
        observer.observe(editor, { childList: true });
        setTimeout(() => {
          boldButton.click();
        }, 1);

        if (performance.mark("end-formatting")) {
          boldButton.click();
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
      }

      return perfTimes;
    },
    [
      selectText.toString(),
      simulatePaste.toString(),
      createObserver.toString(),
    ],
  );

  await browser.stopTracing();
  console.log(
    `Average Text Formatting Duration: ${averageOf(formatTextDuration)}ms`,
  );
});

test("list magic performance", async ({ page, browser }) => {
  await browser.startTracing(page, {
    path: "../tests/trace.json",
    screenshots: true,
  });

  await findEditor(page);

  const createBulletList = await page.evaluate(
    ([simulatePasteFunction, selectTextFunction, createObserverFunction]) => {
      const createTimes = [];

      const editor = document.querySelector(".ContentEditable__root");
      if (!editor) return [];
      const originalList = new Array(5).fill("Lorem ipsum ");

      const bulletListButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "ul") as HTMLElement | null;
      if (!bulletListButton) return [];

      const simulatePasteFn = new Function("return " + simulatePasteFunction)();
      const selectTextFn = new Function("return " + selectTextFunction)();
      const createObserverFn = new Function(
        "return " + createObserverFunction,
      )();
      const perfEndObserver = createObserverFn("ul", () => {
        performance.mark("end-creating");
      });
      const pasteEndObserver = createObserverFn(
        'span[data-lexical-text="true"]',
        () => {
          selectTextFn(editor);
        },
      );

      // 1. paste & select
      simulatePasteFn(`${originalList.join("\n")}\n`, editor);
      pasteEndObserver.observe(editor, { childList: true });

      // 2. creating a bulletList with ul button
      for (let i = 0; i < 1001; i++) {
        performance.mark("start-creating");
        perfEndObserver.observe(editor, { childList: true });
        setTimeout(() => {
          bulletListButton.click();
        }, 1);

        if (performance.mark("end-creating")) {
          performance.measure(
            "creating-list",
            "start-creating",
            "end-creating",
          );
          const measureListCreating = performance
            .getEntriesByName("creating-list")
            .pop();
          if (!measureListCreating) return [];
          createTimes.push(measureListCreating.duration);
        }
      }

      return createTimes;
    },
    [
      simulatePaste.toString(),
      selectText.toString(),
      createObserver.toString(),
    ],
  );
  const addToBulletList = await page.evaluate(
    ([simulatePasteFunction]) => {
      const addingTimes = [];
      const editor = document.querySelector(".ContentEditable__root");
      if (!editor) return [];
      const undoButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "undo") as HTMLElement | null;
      if (!undoButton) return [];

      const simulatePasteFn = new Function("return " + simulatePasteFunction)();

      // can't run the test 1000 times because the undo.click is async
      // and doesn't run as fast as the loop turns
      // and can't put any observer on the undo action
      for (let i = 0; i < 99; i++) {
        performance.mark("start-adding");
        // couldn't find a way to simulate typing
        "adding an item \n".split("").forEach((char) => {
          simulatePasteFn(char, editor);
        });
        performance.mark("end-adding");
        undoButton.click();

        performance.measure("adding-to-list", "start-adding", "end-adding");
        const measureListAdding = performance
          .getEntriesByName("adding-to-list")
          .pop();
        if (!measureListAdding) return [];
        addingTimes.push(measureListAdding.duration);
      }
      return addingTimes;
    },
    [simulatePaste.toString()],
  );

  const modifyBulletList = await page.evaluate(
    ([simulatePasteFunction, selectTextFunction, simulateCutFunction]) => {
      const modifyingTimes = [];
      const editor = document.querySelector(".ContentEditable__root");
      if (!editor) return [];
      const selectTextFn = new Function("return " + selectTextFunction)();
      const simulateCutFn = new Function("return " + simulateCutFunction)();
      selectTextFn(editor);
      simulateCutFn(editor);

      // const originalList = new Array(5).fill("Lorem ipsum ");
      const originalList = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a"];
      const simulatePasteFn = new Function("return " + simulatePasteFunction)();
      const undoButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "undo") as HTMLElement | null;
      if (!undoButton) return [];

      simulatePasteFn(`${originalList.join("\n")}`, editor);

      const moveCaret = (item: number, position: number, editor2: any) => {
        const range = document.createRange();
        const selection = window.getSelection();
        const listItems = editor2.querySelectorAll("ul > li");
        if (!listItems || !selection) return;

        const secondItemSpan = listItems[item].querySelector("span");
        const textNode = secondItemSpan?.firstChild;

        // TODO: I can't write anywhere, why? I also can't reach the editor content
        console.log("t", textNode.textContent);

        if (textNode) {
          range.setStart(textNode, position);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      };

      for (let i = 0; i < 4; i++) {
        performance.mark("start-modifying");
        moveCaret(2, 2, editor);
        " holololo ".split("").forEach((char) => {
          simulatePasteFn(char, editor);
        });
        performance.mark("end-modifying");
        // undoButton.click();

        performance.measure(
          "modifying-list",
          "start-modifying",
          "end-modifying",
        );
        const measureListModifying = performance
          .getEntriesByName("modifying-list")
          .pop();
        if (!measureListModifying) return [];
        modifyingTimes.push(measureListModifying.duration);
      }
      return modifyingTimes;
    },
    [simulatePaste.toString(), selectText.toString(), simulateCut.toString()],
  );

  await browser.stopTracing();
  const createTimes = createBulletList;
  const addingTimes = addToBulletList;
  const modifyingTimes = modifyBulletList;
  console.log("Average duration of creating list", averageOf(createTimes));
  console.log(
    "Average duration of adding items to list",
    averageOf(addingTimes),
  );
  console.log("Average duration of modifying list", averageOf(modifyingTimes));
});

// TODO: get rid of setTimeouts
test("keyboard shortcuts responsiveness", async ({ page, browser }) => {
  await browser.startTracing(page, {
    path: "./trace.json",
    screenshots: true,
  });

  await findEditor(page);
  const shortcutActions = await page.evaluate(
    ([simulatePasteFunction, createObserverFunction, selectTextFunction]) => {
      const selectAllTimes: number[] = [];
      const boldTimes: number[] = [];
      const italicTimes: number[] = [];
      const editor = document.querySelector(".ContentEditable__root");
      if (!editor) return { selectAllTimes, boldTimes, italicTimes };
      const simulatePasteFn = new Function("return " + simulatePasteFunction)();
      const createObserverFn = new Function(
        "return " + createObserverFunction,
      )();
      const selectTextFn = new Function("return " + selectTextFunction)();

      const boldObserver = createObserverFn("strong", () => {
        performance.mark("end-bold");
      });
      const italicObserver = createObserverFn("em", () => {
        performance.mark("end-italic");
      });

      function simulateShortcut(
        editor: any,
        key: string,
        code: string,
        keyCode: number,
      ) {
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const eventInitDict = {
          key: key,
          code: code,
          keyCode: keyCode,
          ctrlKey: !isMac,
          metaKey: isMac, // Cmd key on Mac
          bubbles: true,
        };

        const keydownEvent = new KeyboardEvent("keydown", eventInitDict);
        const keyupEvent = new KeyboardEvent("keyup", eventInitDict);
        editor.dispatchEvent(keydownEvent);
        editor.dispatchEvent(keyupEvent);
      }

      simulatePasteFn("Trying out some shortcuts.  ".repeat(10), editor);
      setTimeout(() => {
        selectTextFn(editor);
      }, 0.5);

      const makeItItalic = () => {
        italicObserver.observe(editor, { childList: true });
        simulateShortcut(editor, "i", "KeyI", 73);
      };

      const makeItBold = () => {
        boldObserver.observe(editor, { childList: true });
        simulateShortcut(editor, "b", "KeyB", 66);
      };

      for (let j = 0; j < 55; j++) {
        performance.mark("start-italic");
        setTimeout(() => {
          makeItItalic();
        }, 1);
      }

      if (performance.mark("end-italic")) {
        for (let i = 0; i < 55; i++) {
          performance.mark("start-bold");
          setTimeout(() => {
            makeItBold();
          }, 1.5);
        }
      }

      if (performance.mark("end-italic")) {
        performance.measure("italic-format", "start-italic", "end-italic");
        const measureItalicFormat = performance
          .getEntriesByName("italic-format")
          .pop();
        if (!measureItalicFormat)
          return {
            selectAllTimes,
            boldTimes,
            italicTimes: [3, 3, 3],
          };
        italicTimes.push(measureItalicFormat.duration);
        console.log("i", measureItalicFormat.toJSON());
      }
      if (performance.mark("end-bold")) {
        performance.measure("bold-format", "start-bold", "end-bold");
        const measureBoldFormat = performance
          .getEntriesByName("bold-format")
          .pop();
        if (!measureBoldFormat)
          return {
            selectAllTimes,
            boldTimes: [1, 1, 1],
            italicTimes,
          };
        boldTimes.push(measureBoldFormat.duration);
      }

      return { selectAllTimes, boldTimes, italicTimes };
    },
    [
      simulatePaste.toString(),
      createObserver.toString(),
      selectText.toString(),
    ],
  );

  await browser.stopTracing();
  const { selectAllTimes, boldTimes, italicTimes } = shortcutActions;
  console.log("Average duration of selecting all", averageOf(selectAllTimes));
  console.log("Average duration of italic", averageOf(italicTimes));
  console.log("Average duration of bold", averageOf(boldTimes));
});

// test.only("measure formatting text performance", async ({ page, browser }) => {
//     await browser.startTracing(page, {
//         path: "./trace.json",
//         screenshots: true,
//     });
//
//     await loadAndClick(page);
//
//
//
//     await browser.stopTracing();
// });
