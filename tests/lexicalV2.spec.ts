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
    await findEditor(page);
  });

  test("input latency", async ({ page }) => {
    test.setTimeout(70000);

    const typeText = await page.evaluate(
      async ([simulatePasteFunction]) => {
        const perfTimes: number[] = [];
        const chineseTextTimes: number[] = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return { perfTimes, chineseTextTimes };
        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        if (!undoButton) return { perfTimes, chineseTextTimes };

        const textChars = "Typing".split("");
        const chineseTextChars = "那不是杂志是".split("");

        for (let i = 0; i < 1000; i++) {
          performance.mark("start");
          // couldn't find a better way to 'type'
          for (const char of textChars) {
            await simulatePasteFn(char, editor);
          }
          performance.mark("end");
          await undoButton.click();
        }

        for (let j = 0; j < 1000; j++) {
          performance.mark("start-chinese");
          for (const char of chineseTextChars) {
            await simulatePasteFn(char, editor);
          }
          performance.mark("end-chinese");
          await undoButton.click();
        }

        performance.measure("typing", "start", "end");
        const latency = performance.getEntriesByName("typing").pop();
        if (!latency) return { perfTimes, chineseTextTimes };
        perfTimes.push(latency.duration);

        performance.measure("typing-chinese", "start-chinese", "end-chinese");
        const latencyChinese = performance
          .getEntriesByName("typing-chinese")
          .pop();
        if (!latencyChinese) return { perfTimes, chineseTextTimes };
        chineseTextTimes.push(latencyChinese.duration);

        return { perfTimes, chineseTextTimes };
      },
      [simulatePaste.toString()],
    );
    const { perfTimes, chineseTextTimes } = typeText;
    console.log(`Typing Performance: ${averageOf(perfTimes)}ms`);
    console.log(
      `Chinese text Typing Performance: ${averageOf(chineseTextTimes)}ms`,
    );
  });

  test("typing performance at scale", async ({ page }) => {
    const typeText = await page.evaluate(
      async ([simulatePasteFunction]) => {
        const perfTimes = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];
        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        if (!undoButton) return [];
        const largeText = "Lorem ipsum ".repeat(500);

        await simulatePasteFn(largeText, editor);
        const textChars = "Testing typing performance".split("");

        for (let i = 0; i < 1000; i++) {
          performance.mark("start");
          for (let char of textChars) {
            await simulatePasteFn(char, editor);
          }
          // "Testing typing performance".split("").forEach((char) => {
          //   simulatePasteFn(char, editor);
          // });
          performance.mark("end");
          await undoButton.click();

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

    const undoredo = await page.evaluate(async () => {
      const undoTimes: number[] = [];
      const redoTimes: number[] = [];
      const editor = document.querySelector(
        ".ContentEditable__root",
      ) as HTMLElement | null;
      if (!editor) return { undoTimes, redoTimes };

      const undoButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "undo") as HTMLElement | null;
      const redoButton = Array.from(
        document.querySelectorAll("button.toolbar__item"),
      ).find((button) => button.textContent === "redo") as HTMLElement | null;
      if (!redoButton || !undoButton) return { undoTimes, redoTimes };

      for (let i = 0; i < 1000; i++) {
        performance.mark("start-undo");
        await undoButton.click();
        performance.mark("end-undo");

        performance.mark("start-redo");
        await redoButton.click();
        performance.mark("end-redo");

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

  // can't access copy/cut from the console, though the fn works fine with z, b, i, a
  test.skip("copy/cut keyboard shortcuts", async ({ page }) => {
    const shortcutActions = await page.evaluate(
      async ([simulatePasteFunction]) => {
        const copyTimes: number[] = [];
        const cutTimes: number[] = [];
        const editor = document.querySelector(".ContentEditable__root");
        if (!editor) return { copyTimes: copyTimes, cutTimes: cutTimes };
        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();

        // document.addEventListener("copy", function (event) {
        //   performance.mark("end-copy");
        // });
        document.addEventListener("cut", function (event) {
          // performance.mark("end-cut");
          console.log("cut");
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

        // 1. paste and select
        simulatePasteFn("Trying out some shortcuts.  ".repeat(1000), editor);
        await simulateShortcut(editor, "a", "KeyA", 65);

        // 2. copy
        for (let i = 0; i < 55; i++) {
          performance.mark("start-copy");
          await simulateShortcut(editor, "c", "KeyC", 67);
        }

        // cut
        for (let j = 0; j < 55; j++) {
          performance.mark("start-cut");
          await simulateShortcut(editor, "x", "KeyX", 88);
          performance.mark("end-cut");
        }

        if (performance.mark("end-copy")) {
          performance.measure("copy", "start-copy", "end-copy");
          const measureCopy = performance.getEntriesByName("copy").pop();
          if (!measureCopy)
            return {
              copyTimes: [1, 1, 1],
              cutTimes: cutTimes,
            };
          copyTimes.push(measureCopy.duration);
        }
        if (performance.mark("end-cut")) {
          performance.measure("cut", "start-cut", "end-cut");
          const measureCut = performance.getEntriesByName("cut").pop();
          if (!measureCut)
            return {
              copyTimes: copyTimes,
              cutTimes: [3, 3, 3],
            };
          cutTimes.push(measureCut.duration);
        }

        return { copyTimes: copyTimes, cutTimes: cutTimes };
      },
      [
        simulatePaste.toString(),
        createObserver.toString(),
        selectText.toString(),
      ],
    );

    const { copyTimes, cutTimes } = shortcutActions;
    console.log("Average duration of copy", averageOf(copyTimes));
    console.log("Average duration of cut", averageOf(cutTimes));
  });

  test("paste operation performance", async ({ page }) => {
    const pastePerf = await page.evaluate(
      async ([simulatePasteFunction]) => {
        const perfTimes: number[] = [];
        const perfTimesChinese: number[] = [];

        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return { perfTimes, perfTimesChinese };
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        if (!undoButton) return { perfTimes, perfTimesChinese };

        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();

        for (let i = 0; i < 1000; i++) {
          performance.mark("start");
          await simulatePasteFn(
            "This is just a sentence pasted 1000 times. ".repeat(1000),
            editor,
          );
          performance.mark("end");
          await undoButton.click();

          performance.measure("paste", "start", "end");
          const pasteLatency = performance.getEntriesByName("paste").pop();
          if (!pasteLatency) return { perfTimes, perfTimesChinese };
          perfTimes.push(pasteLatency.duration);
        }

        for (let i = 0; i < 1000; i++) {
          performance.mark("start-chinese");
          await simulatePasteFn(
            "李红：不，那不是杂志。那是字典。".repeat(1000),
            editor,
          );
          performance.mark("end-chinese");
          await undoButton.click();

          performance.measure("paste-chinese", "start-chinese", "end-chinese");
          const pasteChineseLatency = performance
            .getEntriesByName("paste-chinese")
            .pop();
          if (!pasteChineseLatency) return { perfTimes, perfTimesChinese };
          perfTimesChinese.push(pasteChineseLatency.duration);
        }

        return { perfTimes, perfTimesChinese };
      },
      [simulatePaste.toString()],
    );
    const { perfTimes, perfTimesChinese } = pastePerf;
    console.log(`Average Paste Operation Time: ${averageOf(perfTimes)}ms`);
    console.log(
      `Average Chinese Text Paste Operation Time: ${averageOf(
        perfTimesChinese,
      )}ms`,
    );
  });

  test("text selection performance", async ({ page, browser }) => {
    const selectionPerf = await page.evaluate(
      async ([simulatePasteFunction, selectTextFunction]) => {
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

        await simulatePasteFn(
          "This is a test for selecting large text. ".repeat(1000),
          editor,
        );

        for (let i = 0; i < 1000; i++) {
          performance.mark("start-selection");
          selectTextFn(editor);
          performance.mark("end-selection");
          deselectText();

          performance.measure(
            "text-selection",
            "start-selection",
            "end-selection",
          );
          const measure = performance.getEntriesByName("text-selection").pop();
          if (!measure) return [];
          perfTimes.push(measure.duration);
        }

        return perfTimes;
      },
      [simulatePaste.toString(), selectText.toString()],
    );

    console.log(
      `Lexical Average Selection Duration: ${averageOf(selectionPerf)}ms`,
    );
  });

  test("formatting text performance", async ({ page, browser }) => {
    await page.keyboard.insertText(
      "This is a test for formatting large text. ".repeat(1000),
    );

    const formatTextDuration = await page.evaluate(
      async ([selectTextFunction]) => {
        const perfTimes: number[] = [];
        const removingTimes: number[] = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return { perfTimes, removingTimes };
        const boldButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "B") as HTMLElement | null;
        if (!boldButton) return { perfTimes, removingTimes };
        const selectTextFn = new Function("return " + selectTextFunction)();

        selectTextFn(editor);

        for (let i = 0; i < 1000; i++) {
          performance.mark("start-formatting");
          await boldButton.click();
          performance.mark("end-formatting");

          performance.mark("start-removing");
          await boldButton.click();
          performance.mark("end-removing");

          performance.measure(
            "text-formatting",
            "start-formatting",
            "end-formatting",
          );
          const measure = performance.getEntriesByName("text-formatting").pop();
          if (!measure) return { perfTimes, removingTimes };
          perfTimes.push(measure.duration);

          performance.measure(
            "remove-formatting",
            "start-removing",
            "end-removing",
          );
          const measureRemoving = performance
            .getEntriesByName("remove-formatting")
            .pop();
          if (!measureRemoving) return { perfTimes, removingTimes };
          removingTimes.push(measureRemoving.duration);
        }

        return { perfTimes, removingTimes };
      },
      [selectText.toString()],
    );

    const { perfTimes, removingTimes } = formatTextDuration;
    console.log(`Average Text Formatting Duration: ${averageOf(perfTimes)}ms`);
    console.log(
      `Average time of removing Text Formatting: ${averageOf(removingTimes)}ms`,
    );
  });

  test("formatting with keyboard shortcuts", async ({ page }) => {
    const shortcutActions = await page.evaluate(
      async ([simulatePasteFunction]) => {
        const selectAllTimes: number[] = [];
        const boldTimes: number[] = [];
        const italicTimes: number[] = [];
        const editor = document.querySelector(".ContentEditable__root");
        if (!editor)
          return {
            selectAllTimes,
            boldTimes,
            italicTimes,
          };
        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();

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

        await simulatePasteFn(
          "Trying out some shortcuts.  ".repeat(1000),
          editor,
        );

        // 1. select all
        for (let k = 0; k < 1000; k++) {
          performance.mark("start-select-all");
          simulateShortcut(editor, "a", "KeyA", 65);
          performance.mark("end-select-all");
        }

        // 2. format to bold
        // 3. undo bold format
        for (let i = 0; i < 1000; i++) {
          performance.mark("start-bold");
          simulateShortcut(editor, "b", "KeyB", 66);
          performance.mark("end-bold");
          simulateShortcut(editor, "b", "KeyB", 66);
        }

        // 4. format to italic
        for (let j = 0; j < 1000; j++) {
          performance.mark("start-italic");
          simulateShortcut(editor, "i", "KeyI", 73);
          performance.mark("end-italic");
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

        return { selectAllTimes, boldTimes, italicTimes };
      },
      [simulatePaste.toString()],
    );

    const { selectAllTimes, boldTimes, italicTimes } = shortcutActions;
    console.log("Average duration of selecting all", averageOf(selectAllTimes));
    console.log("Average duration of bold", averageOf(boldTimes));
    console.log("Average duration of italic", averageOf(italicTimes));
  });

  test("list: create performance", async ({ page, browser }) => {
    const text = Array(50).fill("Lorem ipsum ");

    // join them with \n was not working as the editor interpreted it as a soft break
    // also can't use <br>, neither &nbsp;
    for (let line of text) {
      await page.keyboard.insertText(`${line}`);
      await page.keyboard.press("Enter");
    }

    const createBulletList = await page.evaluate(
      async ([selectTextFunction]) => {
        const createTimes = [];

        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];
        const bulletListButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "ul") as HTMLElement | null;
        if (!bulletListButton) return [];
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        if (!undoButton) return [];
        const selectTextFn = new Function("return " + selectTextFunction)();

        selectTextFn(editor);

        // I used setTimeout as I didn't want to make the selectTextFn to async
        // but the .click() is async and doesn't wait for anyone
        for (let i = 0; i < 1000; i++) {
          performance.mark("start-creating");
          await setTimeout(() => {
            bulletListButton.click();
          }, 0.5);
          performance.mark("end-creating");

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

        return createTimes;
      },
      [selectText.toString()],
    );
    console.log(
      `Average duration of creating list: ${averageOf(createBulletList)}ms`,
    );
  });

  test("list: add item performance", async ({ page, browser }) => {
    // it's not enough for the for loop i<1000
    //   test.setTimeout(60000);

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
      async ([simulatePasteFunction]) => {
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
        const newItem = "added item \n".split("");

        for (let i = 0; i < 100; i++) {
          performance.mark("start-adding");
          for (let char of newItem) {
            await simulatePasteFn(char, editor);
          }
          performance.mark("end-adding");
          if (i < 99) await undoButton.click();

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
      `Average duration of adding items to the list: ${averageOf(
        addToBulletList,
      )}`,
    );
  });

  // TODO: 'type' into an arbitrary li - how to move the caret?
  // moving it with selection and range.setStart doesn't work
  // doesn't find one list item (though finds it in the browser)
  // arrowUP doesn't work, backspace works once, then Lexical throws error:
  // // Error: Point.getNode: node not found - at Point.getNode (webpack-internal:///./node_modules/lexical/Lexical.dev.js:6064:15)
  test("list: modifying performance", async ({ page, browser }) => {
    const text = Array(3).fill("Lorem ipsum ");
    const ulButton = await page.waitForSelector(
      'button.toolbar__item:text("ul")',
    );
    await ulButton.click();

    for (let line of text) {
      await page.keyboard.insertText(`${line}`);
      await page.keyboard.press("Enter");
      await page.keyboard.insertText("Lorem ipsum 2345678 ");
      await page.keyboard.press("Enter");
    }
    const modifyBulletList = await page.evaluate(
      async ([simulatePasteFunction]) => {
        const modifyingTimes = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];
        const simulatePasteFn = new Function(
          "return " + simulatePasteFunction,
        )();
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        if (!undoButton) return [];

        const insertedItem = " item inserted ".split("");

        for (let i = 0; i < 1; i++) {
          performance.mark("start-modifying");
          for (let char of insertedItem) {
            await simulatePasteFn(char, editor);
          }
          performance.mark("end-modifying");
          await undoButton.click();

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
      [simulatePaste.toString()],
    );

    console.log(
      "Average duration of modifying list",
      averageOf(modifyBulletList),
    );
  });

  // TODO:
  // * Link Insertion and Editing: Test adding hyperlinks to text and editing existing links.
  test("text selection performance", async ({ page, browser }) => {
    await page.keyboard.insertText("Label for the link");
    const linkPerformance = await page.evaluate(
      async ([selectTextFunction]) => {
        const perfTimes = [];
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        const linkButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "Link") as HTMLElement | null;

        if (!undoButton || !linkButton) return [];

        const selectTextFn = new Function("return " + selectTextFunction)();

        selectTextFn(editor);

        for (let i = 0; i < 1; i++) {
          performance.mark("start");
          await linkButton.click();

          const linkhref = document
            .querySelector("a.mylink")
            ?.getAttribute("href");
          performance.mark("end");

          performance.measure("link", "start", "end");
          const measureLink = performance.getEntriesByName("link").pop();
          if (!measureLink) return [];
          perfTimes.push(measureLink.duration);
        }

        return perfTimes;
      },
      [selectText.toString()],
    );
    console.log(
      "Lexical Average Link Insertion Time:",
      averageOf(linkPerformance),
    );
  });
});
