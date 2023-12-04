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
import { TextSelection } from "prosemirror-state";

test.describe("Prosemirror - user interaction tests", () => {
  test("find editor", async ({ browser }) => {
    const perfArray: Metric[] = [];

    for (let i = 0; i < 30; i++) {
      const newPage = await browser.newPage();
      const session = await newPage.context().newCDPSession(newPage);

      await session.send("Performance.enable");
      await newPage.goto("http://localhost:3000/");
      await newPage.waitForSelector("#editor");
      const performanceMetrics = await session.send("Performance.getMetrics");

      await session.detach();
      await newPage.close();

      const perfMetricsFiltered = performanceMetrics.metrics.filter(
        (metric) => {
          return relevantMetrics.includes(metric.name);
        },
      );
      perfArray.push(...perfMetricsFiltered);
      if (i > 25) console.log("findEditor", i + 1);
    }

    const averagedPerfMetrics = calcAverageMetrics(perfArray);
    const folderPath = path.join(__dirname, "pm-tests");

    fs.writeFile(
      path.join(folderPath, "01findEditorPM.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("PM, result is in: 01findEditorPM.json");
      },
    );
  });

  test("input latency", async ({ browser }) => {
    const perfArray = [];

    for (let i = 0; i < 30; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "", "#editor");

      await page.evaluate(() => {
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

    const folderPath = path.join(__dirname, "pm-tests");

    fs.writeFile(
      path.join(folderPath, "02typingPM.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Prosemirror, result is in: 02typingPM.json");
      },
    );
  });

  test("paste operation performance", async ({ browser }) => {
    const perfArray = [];

    for (let i = 0; i < 30; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "", "#editor");

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

    const folderPath = path.join(__dirname, "pm-tests");

    fs.writeFile(
      path.join(folderPath, "03pastePM.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Prosemirror, result is in: 03pastePM.json");
      },
    );
  });

  // TODO: selection is not working
  test.only("bold formatting text performance", async ({ browser }) => {
    const perfArray = [];

    for (let i = 0; i < 1; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "", "div[contenteditable=true]");
      await page.keyboard.insertText("formatted text and ".repeat(10));
      await page.keyboard.down("Control");
      await page.keyboard.press("a");
      await page.keyboard.up("Control");

      await page.evaluate(async () => {
        const editor = document.querySelector(
          "div[contenteditable=true]",
        ) as HTMLElement | null;
        const boldButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "B") as HTMLElement | null;
        if (!boldButton || !editor) return;

        function simulateCtrlA(element: any) {
          // Create a new KeyboardEvent
          const event = new KeyboardEvent("keydown", {
            key: "a",
            ctrlKey: true, // Indicates the control key is pressed
            bubbles: true, // Event bubbles up through the DOM
          });

          // Dispatch the event on the specified element
          element.dispatchEvent(event);
        }

        simulateCtrlA(editor);
        // setTimeout(() => {
        //   boldButton.click();
        // }, 10);
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

    const folderPath = path.join(__dirname, "pm-tests");

    fs.writeFile(
      path.join(folderPath, "04boldPM.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Prosemirror, result is in: 04boldPM.json");
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
