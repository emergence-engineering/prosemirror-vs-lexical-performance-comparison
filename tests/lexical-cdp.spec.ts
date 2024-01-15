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
import path from "path";

// stress test: do I need page.eval?
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
      if (i % 5 === 0) console.log("findEditor", i);
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

  /*test("no-eval-stress test", async ({ browser }) => {
    test.setTimeout(70000);
    const perfArray: any[] = [];

    for (let i = 0; i < 1; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "lexical", ".ContentEditable__root");

      const interval = setInterval(async () => {
        const performanceMetrics = await session.send("Performance.getMetrics");
        const perfMetricsFiltered = performanceMetrics.metrics.filter(
          (metric) => relevantMetrics.includes(metric.name),
        );
        perfArray.push(...perfMetricsFiltered);
      }, 500);

      await page.keyboard.type("typing and ".repeat(3500));
      // 1000 repeat: 8s
      // 2000 repeat: 22s
      // 2500 repeat: 32s
      // 3000 repeat: > 40s

      await session.detach();
      await page.close();
      clearInterval(interval);
    }

    const folderPath = path.join(__dirname, "lexical-tests");

    fs.writeFile(
      path.join(folderPath, "00stressL.json"),
      JSON.stringify(perfArray),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: 00stressL.json");
      },
    );
  });*/

  test.only("eval-stress test", async ({ browser }) => {
    test.setTimeout(10000000);
    const perfArray: any[] = [];

    for (let i = 0; i < 1; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "lexical", ".ContentEditable__root");

      const interval = setInterval(async () => {
        const performanceMetrics = await session.send("Performance.getMetrics");
        // perfArray.push(...performanceMetrics.metrics);

        const perfMetricsFiltered = performanceMetrics.metrics.filter(
          (metric) => relevantMetrics.includes(metric.name),
        );
        perfArray.push(...perfMetricsFiltered);
      }, 5000);

      await page.evaluate(async () => {
        function delay(ms: number) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
        const myt = "typing ".repeat(60500).split(" ");

        // for (let word of myt) {
        for (let i = 0; i < 60500; i++) {
          document.execCommand("insertText", false, myt[i]);
          await delay(2);
          if (i % 10000 === 0) {
            const time = new Date().toLocaleTimeString();
            console.log(i, time);
          }
        }
      });

      await session.detach();
      await page.close();
      clearInterval(interval);
    }

    const folderPath = path.join(__dirname, "lexical-tests");

    fs.writeFile(
      path.join(folderPath, "001stressL.json"),
      JSON.stringify(perfArray),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: 001stressL.json");
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
      if (i % 5 === 0) console.log("typing", i);
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
      if (i % 5 === 0) console.log("paste", i);
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

  test("bold formatting text performance", async ({ browser }) => {
    const perfArray = [];

    for (let i = 0; i < 30; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "lexical", ".ContentEditable__root");
      await page.keyboard.insertText("formatted text and ".repeat(1000));
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Meta+A");

      await page.evaluate(async () => {
        const boldButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "B") as HTMLElement | null;
        if (!boldButton) return;

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
      if (i % 5 === 0) console.log("bold", i);
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

  // as PM tests doesn't have it
  test.skip("ul: create performance", async ({ browser }) => {
    const perfArray = [];

    for (let i = 0; i < 30; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "lexical", ".ContentEditable__root");
      const listText = Array(50).fill("bulletlist item ");
      for (let line of listText) {
        await page.keyboard.insertText(line);
        await page.keyboard.press("Enter");
      }

      await page.keyboard.press("Control+A");
      await page.keyboard.press("Meta+A");

      await page.evaluate(async () => {
        const bulletListButton = Array.from(
          document.querySelectorAll("button.toolbar__item"),
        ).find((button) => button.textContent === "ul") as HTMLElement | null;
        if (!bulletListButton) return [];

        await bulletListButton.click();
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
      if (i % 5 === 0) console.log("ul", i);
    }
    const averagedPerfMetrics = calcAverageMetrics(perfArray);

    const folderPath = path.join(__dirname, "lexical-tests");
    fs.writeFile(
      path.join(folderPath, "05bulletlistL.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: 05bulletlistL.json");
      },
    );
  });
});