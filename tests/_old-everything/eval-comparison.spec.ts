import { test } from "@playwright/test";

const averageOf = (perfTime: number[]) => {
  return perfTime.reduce((a, b) => a + b, 0) / perfTime.length;
};

test.describe("Who wins?", () => {
  test("everything in one eval", async ({ page }) => {
    await page.goto("http://localhost:3000/lexical");
    const perfTimeCollection: number[][] = [];

    for (let i = 0; i < 20; i++) {
      await page.evaluate(async () => {
        const editor = document.querySelector("div[contenteditable='true']");
        if (!editor) return;

        window.performance.mark("hellow1:start");

        const text = "Hello World";
        for (const char of text) {
          const event = new KeyboardEvent("keydown", {
            key: char,
            code: `Key${char.toUpperCase()}`,
            charCode: char.charCodeAt(0),
          });
          editor.dispatchEvent(event);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        window.performance.mark("hellow1:stop");

        const dur = window.performance.measure(
          "hellow",
          "hellow1:start",
          "hellow1:stop",
        );
      });

      // for me, even though I don't use it, if I delete this the test breaks...
      const getAllMarksJson = await page.evaluate(() =>
        JSON.stringify(window.performance.getEntriesByType("mark")),
      );
      const getAllMarks = JSON.parse(getAllMarksJson);

      // all the measures - my stamps and chrome's together
      const getAllMeasuresJson = await page.evaluate(() =>
        JSON.stringify(window.performance.getEntriesByType("measure")),
      );
      const getAllMeasures = JSON.parse(getAllMeasuresJson);

      // collect the relevant numbers only
      perfTimeCollection.push(
        getAllMeasures.map((item: any) => {
          if (item.name === "hellow") {
            return item.duration;
          }
          return 0;
        }),
      );
    }
    const perfTimes = perfTimeCollection[perfTimeCollection.length - 1];

    console.log("1eval, type hellow", averageOf(perfTimes));
  });

  test("seperate evals", async ({ page }) => {
    // test.setTimeout(60000);
    await page.goto("http://localhost:3000/lexical");
    const perfTimeCollection: number[][] = [];

    for (let i = 0; i < 20; i++) {
      await page.click(".ContentEditable__root");

      await page.evaluate(() => window.performance.mark("perf:start"));
      await page.keyboard.type("Hello World", { delay: 10 });
      await page.evaluate(() => window.performance.mark("perf:stop"));

      await page.evaluate(() =>
        window.performance.measure("hellow", "perf:start", "perf:stop"),
      );

      const getAllMarksJson = await page.evaluate(() =>
        JSON.stringify(window.performance.getEntriesByType("mark")),
      );
      const getAllMarks = JSON.parse(getAllMarksJson);

      const getAllMeasuresJson = await page.evaluate(() =>
        JSON.stringify(window.performance.getEntriesByType("measure")),
      );
      const getAllMeasures = JSON.parse(getAllMeasuresJson);

      perfTimeCollection.push(
        getAllMeasures.map((item: any) => {
          if (item.name === "hellow") {
            return item.duration;
          }
          return 0;
        }),
      );
    }
    const perfTimes = perfTimeCollection[perfTimeCollection.length - 1];
    console.log("3 eval, type hellow", averageOf(perfTimes));
  });
});