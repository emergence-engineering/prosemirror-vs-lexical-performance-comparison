import { test } from "@playwright/test";
import {
  averageOf,
  createObserver,
  findEditor,
  selectText,
  simulatePaste,
} from "./utils";

test.describe("Lexical - user interaction tests", () => {
  test.beforeEach(async ({ page, browser }) => {
    await browser.startTracing(page, {
      path: "./trace.json",
      screenshots: true,
    });
    await findEditor(page);
  });

  test.afterEach(async ({ browser }) => {
    await browser.stopTracing();
  });

  test("input latency", async ({ page }) => {
    const typeText = await page.evaluate(
      ([simulatePasteFunction]) => {
        const perfTimes = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];

        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();

        for (let i = 0; i < 1000; i++) {
          performance.mark("start");
          "Testing typing performance".split("").forEach((char) => {
            simulatePasteFn(char, editor);
          });
          performance.mark("end");
        }
        performance.measure("typing", "start", "end");
        const latency = performance.getEntriesByName("typing").pop();
        if (!latency) return [];
        perfTimes.push(latency.duration);

        return perfTimes;
      },
      [simulatePaste.toString()],
    );

    console.log("Typing Performance: ", averageOf(typeText), "ms");
  });

  test("typing performance at scale", async ({ page }) => {
    const typeText = await page.evaluate(
      ([simulatePasteFunction]) => {
        const largeText = "Lorem ipsum ".repeat(500); // Creates a large block of text

        const perfTimes = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];

        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
        simulatePasteFn(largeText, editor);

        for (let i = 0; i < 1000; i++) {
          performance.mark("start");
          "Testing typing performance".split("").forEach((char) => {
            simulatePasteFn(char, editor);
          });
          performance.mark("end");

          performance.measure("typing", "start", "end");
          const latency = performance.getEntriesByName("typing").pop();
          if (!latency) return [];
          perfTimes.push(latency.duration);
        }
        return perfTimes;
      },
      [simulatePaste.toString()],
    );

    console.log(`Typing Performance at Scale: ${averageOf(typeText)}ms`);
  });

  test("undo/redo performance", async ({ page }) => {
    await page.keyboard.type("Testing it");

    const undoredo = await page.evaluate(() => {
      const undoTimes: number[] = [];
      const redoTimes: number[] = [];
      const editor = document.querySelector(
        ".ContentEditable__root",
      ) as HTMLElement | null;
      if (!editor) return { undoTimes, redoTimes };

      const undoButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "undo") as HTMLElement | null;
      if (!undoButton) return { undoTimes, redoTimes };
      const redoButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "redo") as HTMLElement | null;
      if (!redoButton) return { undoTimes, redoTimes };

      for (let i = 0; i < 1; i++) {
        performance.mark("start-undo");
        undoButton.click();
        performance.mark("end-undo");

        if (performance.mark("end-undo")) {
          performance.mark("start-redo");
          redoButton.click();
          performance.mark("end-redo");
        }

        performance.measure("undo", "start-undo", "end-undo");
        const undoLatency = performance.getEntriesByName("undo").pop();
        if (!undoLatency) return { undoTimes, redoTimes };
        undoTimes.push(undoLatency.duration);

        performance.measure("redo", "start-redo", "end-redo");
        const redoLatency = performance.getEntriesByName("redo").pop();
        if (!redoLatency) return { undoTimes, redoTimes };
        redoTimes.push(redoLatency.duration);
      }
      return { undoTimes, redoTimes };
    });
    const { undoTimes, redoTimes } = undoredo;
    console.log(`Lexical Undo Performance: ${averageOf(undoTimes)}ms`);
    console.log(`Lexical Redo Performance: ${averageOf(redoTimes)}ms`);
  });

  // none of the editors are scrollable by default
  test.skip("scroll performance", async ({ page }) => {
    const largeText = "Lorem ipsum ".repeat(500);
    await page.keyboard.type(largeText, { delay: 0 });

    const scrollPerformance = await page.evaluate(() => {
      const perfTimes = [];
      const editor = document.querySelector(
        ".ContentEditable__root",
      ) as HTMLElement | null;
      if (!editor) return [];

      for (let i = 0; i < 1; i++) {
        performance.mark("start-scroll");
        editor.scrollTop = editor.scrollHeight; // Scroll to the bottom
        performance.mark("end-scroll");

        performance.measure("scroll", "start-scroll", "end-scroll");
        const scrollLatency = performance.getEntriesByName("scroll").pop();
        if (!scrollLatency) return [];
        perfTimes.push(scrollLatency.duration);
      }
      return perfTimes;
    });

    console.log(`Lexical Scroll Performance: ${scrollPerformance}ms`);
  });

  test("paste operation performance", async ({ page }) => {
    const pastePerf = await page.evaluate(
      ([simulatePasteFunction, createObserverFunction]) => {
        const perfTimes = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        if (!undoButton) return [];

        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
        const createObserverFn = new Function(
          "return " + createObserverFunction,
        )();
        const pasteEndObserver = createObserverFn(
          'span[data-lexical-text="true"]',
          () => {
            performance.mark("end");
          },
        );
        pasteEndObserver.observe(editor, { childList: true });

        for (let i = 0; i < 1000; i++) {
          performance.mark("start");
          simulatePasteFn(
            "This is just a sentence pasted 1000 times. ".repeat(100),
            editor,
          );
          // otherwise it would execute before pasting has finished
          setTimeout(() => {
            undoButton.click();
          }, 1);

          if (performance.mark("end")) {
            performance.measure("paste", "start", "end");
            const pasteLatency = performance.getEntriesByName("paste").pop();
            if (!pasteLatency) return [];
            perfTimes.push(pasteLatency.duration);
          }
        }
        return perfTimes;
      },
      [simulatePaste.toString(), createObserver.toString()],
    );

    console.log(`Average Paste Operation Time: ${averageOf(pastePerf)}ms`);
  });

  test("text selection performance", async ({ page, browser }) => {
    const selectionDurations = await page.evaluate(
      ([simulatePasteFunction, selectTextFunction, createObserverFunction]) => {
        const perfTimes: number[] = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];
        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
        const selectTextFn = new Function("return " + selectTextFunction)();
        const deselectText = () => {
          const selection = window.getSelection();
          if (!selection) return;
          selection.removeAllRanges();
        };

        simulatePasteFn(
          "This is a test for selecting large text. ".repeat(1000),
          editor,
        );

        for (let i = 0; i < 1000; i++) {
          performance.mark("start-selection");
          setTimeout(() => {
            selectTextFn(editor);
          }, 0.5);
          performance.mark("end-selection");
          setTimeout(() => {
            deselectText();
          }, 1);

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
      [
        simulatePaste.toString(),
        selectText.toString(),
        createObserver.toString(),
      ],
    );

    console.log(
      `Lexical Average Selection Duration: ${averageOf(selectionDurations)}ms`,
    );
  });

  test("formatting text performance", async ({ page, browser }) => {
    await page.keyboard.insertText(
      "This is a test for formatting text. ".repeat(1000),
    );

    const formatTextDuration = await page.evaluate(
      ([selectTextFunction, simulatePasteFunction, createObserverFunction]) => {
        const perfTimes = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];
        const boldButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "B") as HTMLElement | null;
        if (!boldButton) return [];

        const selectTextFn = new Function("return " + selectTextFunction)();
        const createObserverFn = new Function(
          "return " + createObserverFunction,
        )();
        const boldObserver = createObserverFn("strong", "end-formatting");

        // select text
        selectTextFn(editor);

        for (let i = 0; i < 1000; i++) {
          performance.mark("start-formatting");
          boldObserver.observe(editor, { childList: true });
          setTimeout(() => {
            boldButton.click();
          }, 0.5);

          if (performance.mark("end-formatting")) {
            performance.measure(
              "text-formatting",
              "start-formatting",
              "end-formatting",
            );
            const measure = performance
              .getEntriesByName("text-formatting")
              .pop();
            performance.clearMarks();
            performance.clearMeasures();
            if (!measure) return [];
            perfTimes.push(measure.duration);

            // to clear format
            boldButton.click();
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

    console.log(
      `Average Text Formatting Duration: ${averageOf(formatTextDuration)}ms`,
    );
  });

  test("list: create performance", async ({ page, browser }) => {
    const text = Array(3).fill("Lorem ipsum ");
    // join them with \n was not working as the editor interpreted it as a soft break
    // also can't use <br>, neither &nbsp;
    for (let line of text) {
      await page.keyboard.insertText(`${line}`);
      await page.keyboard.press("Enter");
    }

    const createBulletList = await page.evaluate(
      ([selectTextFunction, createObserverFunction]) => {
        const createTimes = [];

        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];
        const bulletListButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "ul") as HTMLElement | null;
        if (!bulletListButton) return [];
        const selectTextFn = new Function("return " + selectTextFunction)();
        const createObserverFn = new Function(
          "return " + createObserverFunction,
        )();
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        if (!undoButton) return [];

        const perfEndObserver = createObserverFn("ul", () => {
          performance.mark("end-creating");
        });

        selectTextFn(editor);

        for (let i = 0; i < 11; i++) {
          performance.mark("start-creating");
          perfEndObserver.observe(editor, { childList: true });
          setTimeout(() => {
            bulletListButton.click();
          }, 0.5);

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
    console.log(
      "Average duration of creating list",
      averageOf(createBulletList),
    );
  });

  // TODO: somehow undo the last line before the loop turns
  test("list: add item performance", async ({ page, browser }) => {
    const text = Array(3).fill("Lorem ipsum ");
    const ulButton = await page.waitForSelector(
      'button.toolbar__item:text("ul")',
    );
    await ulButton.click();
    for (let line of text) {
      await page.keyboard.insertText(`${line}`);
      await page.keyboard.press("Enter");
    }
    const addToBulletList = await page.evaluate(
      ([simulatePasteFunction]) => {
        const addingTimes = [];
        const editor = document.querySelector(".ContentEditable__root");
        if (!editor) return [];
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        if (!undoButton) return [];

        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();

        for (let i = 0; i < 10; i++) {
          performance.mark("start-adding");
          // couldn't find a better way to simulate typing
          "adding an item \n".split("").forEach((char) => {
            simulatePasteFn(char, editor);
          });
          performance.mark("end-adding");
          // can't undo it as the click is async and runs in diff speed as the loop
          // cmd+z also doesn't work
          // undoButton.click();

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
    console.log(
      "Average duration of adding items to the list",
      averageOf(addToBulletList),
    );
  });

  test.only("list: modifying performance", async ({ page, browser }) => {
    const text = Array(3).fill("Lorem ipsum ");
    const ulButton = await page.waitForSelector(
      'button.toolbar__item:text("ul")',
    );
    await ulButton.click();
    for (let line of text) {
      await page.keyboard.insertText(`${line}`);
      await page.keyboard.press("Enter");
    }
    const modifyBulletList = await page.evaluate(
      ([simulatePasteFunction, selectTextFunction, simulateCutFunction]) => {
        const modifyingTimes = [];
        const editor = document.querySelector(".ContentEditable__root");
        if (!editor) return [];
        const selectTextFn = new Function("return " + selectTextFunction)();
        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        if (!undoButton) return [];

        selectTextFn(editor);

        // TODO: how to move the caret
        const moveCaret = (position: number, editor: any) => {
          const range = document.createRange();
          const selection = window.getSelection();
          if (!selection) return;
          range.setStart(editor, position);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          console.log("e", editor.outerHTML);
        };

        for (let i = 0; i < 4; i++) {
          performance.mark("start-modifying");
          moveCaret(1, editor);
          " item inserted successfully ".split("").forEach((char) => {
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
      [simulatePaste.toString(), selectText.toString()],
    );

    console.log(
      "Average duration of modifying list",
      averageOf(modifyBulletList),
    );
  });

  // TODO: get rid of setTimeouts
  test("keyboard shortcuts responsiveness", async ({ page, browser }) => {
    const shortcutActions = await page.evaluate(
      ([simulatePasteFunction, createObserverFunction]) => {
        const selectAllTimes: number[] = [];
        const boldTimes: number[] = [];
        const italicTimes: number[] = [];
        const editor = document.querySelector(".ContentEditable__root");
        if (!editor) return { selectAllTimes, boldTimes, italicTimes };
        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
        const createObserverFn = new Function(
          "return " + createObserverFunction,
        )();

        const boldObserver = createObserverFn("strong", () => {
          performance.mark("end-bold");
        });
        const italicObserver = createObserverFn("em", () => {
          performance.mark("end-italic");
        });

        // can't be moved to utils, it breaks
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

        simulatePasteFn("Trying out some shortcuts.  ".repeat(1000), editor);

        for (let k = 0; k < 55; k++) {
          performance.mark("start-select-all");
          setTimeout(() => {
            simulateShortcut(editor, "a", "KeyA", 65);
          }, 0.5);
          performance.mark("end-select-all");
        }

        for (let i = 0; i < 55; i++) {
          performance.mark("start-bold");
          // setTimeout(() => {
          boldObserver.observe(editor, { childList: true });
          simulateShortcut(editor, "b", "KeyB", 66);
          // }, 1);
        }

        if (performance.mark("end-bold")) {
          for (let j = 0; j < 55; j++) {
            performance.mark("start-italic");
            setTimeout(() => {
              italicObserver.observe(editor, { childList: true });
              simulateShortcut(editor, "i", "KeyI", 73);
            }, 1.5);
          }
        }

        performance.measure("select-all", "start-select-all", "end-select-all");
        const measureSelectAll = performance
          .getEntriesByName("select-all")
          .pop();
        if (!measureSelectAll)
          return {
            selectAllTimes: [2, 2, 2],
            boldTimes,
            italicTimes,
          };
        selectAllTimes.push(measureSelectAll.duration);
        console.log("selection", measureSelectAll.toJSON());

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
          console.log("bold", measureBoldFormat.toJSON());
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
          console.log("italic", measureItalicFormat.toJSON());
        }

        return { selectAllTimes, boldTimes, italicTimes };
      },
      [
        simulatePaste.toString(),
        createObserver.toString(),
        selectText.toString(),
      ],
    );

    const { selectAllTimes, boldTimes, italicTimes } = shortcutActions;
    console.log("Average duration of selecting all", averageOf(selectAllTimes));
    console.log("Average duration of bold", averageOf(boldTimes));
    console.log("Average duration of italic", averageOf(italicTimes));
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
});
