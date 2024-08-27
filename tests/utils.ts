import { Page } from "@playwright/test";

export const findEditor = async (page: Page, editor: string, qs: string) => {
  await page.goto(`http://localhost:3000/${editor}`);
  await page.waitForSelector(qs);
  await page.click(qs);
  page.on("console", (consoleMessage) => {
    if (consoleMessage.type() === "error") return;
    console.log(
      `${
        editor === " " ? "PM" : "Lexical"
      }, browser console: \n${consoleMessage.text()}`,
    );
  });
};