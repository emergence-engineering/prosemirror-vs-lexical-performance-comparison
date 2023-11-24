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

test.describe("Lexical - user interaction tests", () => {
  test.beforeEach(async ({ page }) => {
    await findEditor(page);
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

  // none of the editor are scrollable by default
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

  test.only("paste operation", async ({ page }) => {
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

        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
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
    console.log(
      `Average Selection Duration: ${averageOf(selectionDurations)}ms`,
    );
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

        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
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

            const measure = performance
              .getEntriesByName("text-formatting")
              .pop();
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

        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
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

        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();

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
        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
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
    console.log(
      "Average duration of modifying list",
      averageOf(modifyingTimes),
    );
  });

  // TODO: get rid of setTimeouts
  test("keyboard shortcuts responsiveness", async ({ page, browser }) => {
    await browser.startTracing(page, {
      path: "./trace.json",
      screenshots: true,
    });

    // await findEditor(page);
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

    await browser.stopTracing();
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
