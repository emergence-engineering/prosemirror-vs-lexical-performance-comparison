import { test } from "@playwright/test";
import {
  averageOf,
  calcAverageMetrics,
  findEditor,
  Metric,
  relevantMetrics,
  selectText,
} from "./utils";
import fs from "fs";
import path from "path";

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
      if (i > 25) console.log("findEditor", i);
    }

    const averagedPerfMetrics = calcAverageMetrics(perfArray);

    const folderPath = path.join(__dirname, "lexical-tests");

    fs.writeFile(
      path.join(folderPath, "01findEditorL.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: 01findEditorL.json");
      },
    );
  });

  test("input latency", async ({ browser }) => {
    const perfArray = [];

    for (let i = 0; i < 30; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "lexical", ".ContentEditable__root");

      await page.evaluate(async () => {
        document.execCommand("insertText", false, "Typing");
      });

      const performanceMetrics = await session.send("Performance.getMetrics");
      await session.detach();
      await page.close();

      const perfMetricsFiltered = performanceMetrics.metrics.filter(
        (metric) => {
          return relevantMetrics.includes(metric.name);
        },
      );
      perfArray.push(...perfMetricsFiltered);
      if (i > 25) console.log("typing", i + 1);
    }

    const averagedPerfMetrics = calcAverageMetrics(perfArray);

    const folderPath = path.join(__dirname, "lexical-tests");

    fs.writeFile(
      path.join(folderPath, "02typingL.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: 02typingL.json");
      },
    );
  });

  test("paste operation performance", async ({ browser }) => {
    const perfArray = [];

    for (let i = 0; i < 30; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "lexical", ".ContentEditable__root");

      await page.evaluate(() => {
        document.execCommand("insertText", false, "typing and ".repeat(1000));
      });

      const performanceMetrics = await session.send("Performance.getMetrics");
      await session.detach();
      await page.close();

      const perfMetricsFiltered = performanceMetrics.metrics.filter(
        (metric) => {
          return relevantMetrics.includes(metric.name);
        },
      );
      perfArray.push(...perfMetricsFiltered);
      if (i > 25) console.log("typing", i + 1);
    }

    const averagedPerfMetrics = calcAverageMetrics(perfArray);

    const folderPath = path.join(__dirname, "lexical-tests");
    fs.writeFile(
      path.join(folderPath, "03pasteL.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: 03pasteL.json");
      },
    );
  });

  test.only("bold formatting text performance", async ({ browser }) => {
    const perfArray = [];

    for (let i = 0; i < 30; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "lexical", ".ContentEditable__root");
      await page.keyboard.insertText("formatted text and ".repeat(1000));

      await page.evaluate(async () => {
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        const boldButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "B") as HTMLElement | null;
        if (!boldButton || !editor) return;

        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const selectEvent = new KeyboardEvent("keydown", {
          key: "A",
          keyCode: 65, // keyCode for Backspace
          code: "KeyA",
          ctrlKey: !isMac,
          metaKey: isMac, // Cmd key on Mac
          bubbles: true,
        });

        editor.dispatchEvent(selectEvent);
        await boldButton.click();
      });

      const performanceMetrics = await session.send("Performance.getMetrics");
      await session.detach();
      await page.close();

      const perfMetricsFiltered = performanceMetrics.metrics.filter(
        (metric) => {
          return relevantMetrics.includes(metric.name);
        },
      );
      perfArray.push(...perfMetricsFiltered);
      if (i > 25) console.log("bold", i + 1);
    }
    const averagedPerfMetrics = calcAverageMetrics(perfArray);

    const folderPath = path.join(__dirname, "lexical-tests");
    fs.writeFile(
      path.join(folderPath, "04formattingL.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: 04formattingL.json");
      },
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