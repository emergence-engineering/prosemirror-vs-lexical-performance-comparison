import { Page } from "@playwright/test";

export const findEditor = async (page: Page) => {
  await page.goto("http://localhost:3000/lexical");
  await page.waitForSelector(".ContentEditable__root");
  await page.click(".ContentEditable__root");
  page.on("console", (consoleMessage) => {
    if (consoleMessage.type() === "error") return;
    console.log(`Browser console: \n${consoleMessage.text()}`);
  });
};

export const averageOf = (perfTime: number[]) => {
  return perfTime.reduce((a, b) => a + b, 0) / perfTime.length;
};

export const pasteText = async (page: Page, n: number) => {
  return page.evaluate((n) => {
    const largeText = "Lorem ipsum ".repeat(n);
    // navigator.clipboard.writeText(largeText);
    const startTimePaste = performance.now();
    let editor = document.querySelector("div[contenteditable='true']");
    if (!editor) return 0;
    editor.textContent = largeText;
    return performance.now() - startTimePaste;
  }, n);
};

export const selectText = (element: Element) => {
  const selection = window.getSelection();
  if (!selection) return "oo";
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
  return selection.toString();
};

export function simulatePaste(text: string, element: any) {
  const event = new Event("paste", {
    bubbles: true,
    cancelable: true,
  });

  event.clipboardData = {
    getData: function (type: any) {
      if (type === "text/plain") {
        return text;
      }
      return "";
    },
  };
  element.dispatchEvent(event);
}

export function simulateCut(element: any) {
  const event = new Event("cut", {
    bubbles: true,
    cancelable: true,
  });

  // Dispatch the event
  element.dispatchEvent(event);
}

export const createObserver = (qs: string, doSomething: () => void) => {
  return new MutationObserver((mutations, obs) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        const searchedElements =
          mutation.target.parentElement?.querySelectorAll(qs);

        if (searchedElements && searchedElements.length > 0) {
          doSomething();
          obs.disconnect(); // Stop observing once the change is detected
          break;
        }
      }
    }
  });
};

export const simulateTyping = (text: string, editor: any) => {
  text.split("").forEach((char) => {
    simulatePaste(char, editor);
  });
};
