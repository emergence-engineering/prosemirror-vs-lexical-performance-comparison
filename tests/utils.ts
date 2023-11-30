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

export const selectText = (element: Element) => {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
};

// I had to turn this to async as using a pasteObserver was not enough for some tests
export async function simulatePaste(text: string, element: any): Promise<void> {
  return new Promise((resolve) => {
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
    setTimeout(() => {
      resolve();
    }, 0);
  });
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
