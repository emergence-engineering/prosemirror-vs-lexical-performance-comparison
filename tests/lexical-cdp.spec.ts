import { test } from "@playwright/test";
import {
  averageOf,
  calcAverageMetrics,
  findEditor,
  Metric,
  relevantMetrics,
  selectText,
  simulatePaste,
} from "./utils";
import fs from "fs";

// find editor cdp
// // for loop, average of metrics collected to a single file
// one test, for loop for each, average of metrics
// // write in the editor
// // paste large text
// // bold format of large text
// // paste and make list from large text
// diagram: x event, y: metrics (one diagram or 4 diff?)
// // x: find, write, paste, bold, list;
// // y: bundle size, memory, cpu usage, latency
// article

// test.describe("CDP Demo", () => {
//   test("Get performance metrics", async ({ page }) => {
//     //Create a new connection to an existing CDP session to enable performance Metrics
//     const session = await page.context().newCDPSession(page);
//     //To tell the CDPsession to record performance metrics.
//     await session.send("Performance.enable");
//     await page.goto("http://localhost:3000/lexical");
//     await page.waitForSelector(".ContentEditable__root");
//     // await page.click(".ContentEditable__root");
//     console.log("=============CDP Performance Metrics===============");
//     let performanceMetrics = await session.send("Performance.getMetrics");
//     console.log(performanceMetrics.metrics);
//   });
// });
test.describe("Lexical - user interaction tests", () => {
  test("find editor", async ({ browser }) => {
    const perfArray: Metric[] = [];

    for (let i = 0; i < 30; i++) {
      const newPage = await browser.newPage();
      const session = await newPage.context().newCDPSession(newPage);

      await session.send("Performance.enable");
      await newPage.goto("http://localhost:3000/lexical");
      await newPage.waitForSelector(".ContentEditable__root");
      const performanceMetrics = await session.send("Performance.getMetrics");

      await session.detach();
      await newPage.close();

      const perfMetricsFiltered = performanceMetrics.metrics.filter(
        (metric) => {
          return relevantMetrics.includes(metric.name);
        },
      );
      perfArray.push(...perfMetricsFiltered);
    }

    const averagedPerfMetrics = calcAverageMetrics(perfArray);

    fs.writeFile(
      "findEditorL.json",
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: findEditorL.json");
      },
    );
  });

  test.only("input latency", async ({ page }) => {
    test.setTimeout(70000);
    await findEditor(page, "lexical", ".ContentEditable__root");
    page;

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

  test("paste operation performance", async ({ page }) => {
    const pastePerf = await page.evaluate(
      async ([simulatePasteFunction]) => {
        const perfTimes: number[] = [];
        const perfTimesChinese: number[] = [];
        const hrTimes: number[] = [];

        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return { perfTimes, perfTimesChinese, hrTimes };
        const undoButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "undo") as HTMLElement | null;
        const hrButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "HR") as HTMLElement | null;
        if (!undoButton || !hrButton)
          return { perfTimes, perfTimesChinese, hrTimes };

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
          if (!pasteLatency) return { perfTimes, perfTimesChinese, hrTimes };
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
          if (!pasteChineseLatency)
            return { perfTimes, perfTimesChinese, hrTimes };
          perfTimesChinese.push(pasteChineseLatency.duration);
        }

        for (let i = 0; i < 1000; i++) {
          performance.mark("start-hr");
          await hrButton.click();
          performance.mark("end-hr");
          await undoButton.click();

          performance.measure("paste-hr", "start-hr", "end-hr");
          const pasteHRLatency = performance.getEntriesByName("paste-hr").pop();
          if (!pasteHRLatency) return { perfTimes, perfTimesChinese, hrTimes };
          hrTimes.push(pasteHRLatency.duration);
        }

        return { perfTimes, perfTimesChinese, hrTimes };
      },
      [simulatePaste.toString()],
    );
    const { perfTimes, perfTimesChinese, hrTimes } = pastePerf;
    console.log(`Average Paste Operation Time: ${averageOf(perfTimes)}ms`);
    console.log(
      `Average Chinese Text Paste Operation Time: ${averageOf(
        perfTimesChinese,
      )}ms`,
    );
    console.log(`Average HR Paste Operation Time: ${averageOf(hrTimes)}ms`);
  });

  test("bold formatting text performance", async ({ page, browser }) => {
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

  test("ul: create performance", async ({ page, browser }) => {
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
      `Average duration of creating bulletlist: ${averageOf(
        createBulletList,
      )}ms`,
    );
  });
});

// bundle size, memory, latency, accessibility?
