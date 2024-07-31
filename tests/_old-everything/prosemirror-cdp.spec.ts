import { test } from "@playwright/test";
import {
  calcAverageMetrics,
  findEditor,
  Metric,
  relevantMetrics,
} from "./utils";
import fs from "fs";
import path from "path";

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
      if (i % 5 === 0) console.log("findEditor", i);
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

  /*test("no-eval-stress test", async ({ browser }) => {
    test.setTimeout(70000);
    const perfArray: any[] = [];

    for (let i = 0; i < 1; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "", "#editor");

      const interval = setInterval(async () => {
        const performanceMetrics = await session.send("Performance.getMetrics");
        const perfMetricsFiltered = performanceMetrics.metrics.filter(
          (metric) => relevantMetrics.includes(metric.name),
        );
        perfArray.push(...perfMetricsFiltered);
      }, 500);

      await page.keyboard.type("typing and ".repeat(500));

      await session.detach();
      await page.close();
      clearInterval(interval);
    }

    const folderPath = path.join(__dirname, "pm-tests");

    fs.writeFile(
      path.join(folderPath, "00stressPM.json"),
      JSON.stringify(perfArray),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: 00stressPM.json");
      },
    );
  }); */

  test.only("eval-stress test", async ({ browser }) => {
    test.setTimeout(10000000);
    const perfArray: any[] = [];

    for (let i = 0; i < 1; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "", "#editor");

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

        // for (const word of myt) {
        for (let i = 0; i < 60500; i++) {
          document.execCommand("insertText", false, myt[i]);
          await delay(2);
          if (i % 10000 === 0 || (i > 50000 && i % 1000 === 0)) {
            const time = new Date().toLocaleTimeString();
            console.log(i, time);
          }
        }
      });

      await session.detach();
      await page.close();
      clearInterval(interval);
    }

    const folderPath = path.join(__dirname, "pm-tests");

    fs.writeFile(
      path.join(folderPath, "stressPM.json"),
      JSON.stringify(perfArray),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: stressPM.json");
      },
    );
  });

  /* test("BASIC eval-stress test", async ({ browser }) => {
    test.setTimeout(10000000);
    const perfArray: any[] = [];

    for (let i = 0; i < 1; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "basic", "#basicEditor");

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
        const myt = "typing ".repeat(90000).split(" ");

        // for (const word of myt) {
        for (let i = 0; i < 90000; i++) {
          document.execCommand("insertText", false, myt[i]);
          await delay(2);
          if (i % 10000 === 0 || (i > 80000 && i % 1000 === 0)) {
            const time = new Date().toLocaleTimeString();
            console.log(i, time);
          }
        }
      });

      await session.detach();
      await page.close();
      clearInterval(interval);
    }

    const folderPath = path.join(__dirname, "pm-tests");

    fs.writeFile(
      path.join(folderPath, "001stressB.json"),
      JSON.stringify(perfArray),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Lexical, result is in: 001stressB.json");
      },
    );
  });

   */

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
      if (i % 5 === 0) console.log("typing", i);
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
      if (i % 5 === 0) console.log("typing", i);
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

  test("bold formatting text performance", async ({ browser }) => {
    const perfArray = [];
    const perfArray2 = [];

    for (let i = 0; i < 30; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "", "div[contenteditable=true]");
      await page.keyboard.insertText("formatted text and ".repeat(1000));
      await page.keyboard.press("Control+A");
      await page.keyboard.press("Meta+A");

      await page.evaluate(async () => {
        const editor = document.querySelector(
          "div[contenteditable=true]",
        ) as HTMLElement | null;
        if (!editor) return;

        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const boldEvent = new KeyboardEvent("keydown", {
          key: "b",
          ctrlKey: !isMac, // Use Ctrl key for non-Mac systems
          metaKey: isMac, // Use Command key (metaKey) for Mac systems
          bubbles: true, // Event bubbles up through the DOM
        });
        editor.dispatchEvent(boldEvent);
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

  // TODO: no click event
  test.skip("ul: create performance", async ({ browser }) => {
    const perfArray = [];

    for (let i = 0; i < 1; i++) {
      const page = await browser.newPage();
      const session = await page.context().newCDPSession(page);
      await session.send("Performance.enable");
      await findEditor(page, "", "div[contenteditable=true]");
      const listText = Array(10).fill("bulletlist item ");
      for (let line of listText) {
        await page.keyboard.insertText(line);
        await page.keyboard.press("Enter");
      }

      await page.keyboard.press("Control+A");
      await page.keyboard.press("Meta+A");

      await page.evaluate(async () => {
        const editor = document.querySelector(
          ".ContentEditable__root",
        ) as HTMLElement | null;
        if (!editor) return [];
        const bulletListButton = document.querySelector(
          'span.ProseMirror-menuitem > div.ProseMirror-icon[title="Wrap in bullet list"]',
        ) as HTMLElement | null;
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

    const folderPath = path.join(__dirname, "pm-tests");

    fs.writeFile(
      path.join(folderPath, "05bulletlistPM.json"),
      JSON.stringify(averagedPerfMetrics),
      "utf8",
      (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log("Prosemirror, result is in: 05bulletlistPM.json");
      },
    );
  });
});