import { Browser, Page } from "@playwright/test";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createParagraphNode, $getRoot, $getSelection } from "lexical";

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

export const averageOf = (perfTime: number[]) => {
  return perfTime.reduce((a, b) => a + b, 0) / perfTime.length;
};

// export const selectText = (element: Element) => {
//   const selection = window.getSelection();
//   if (!selection) return;
//   const range = document.createRange();
//   range.selectNodeContents(element);
//   selection.removeAllRanges();
//   selection.addRange(range);
// };

export const selectText = async (element: Element): Promise<void> => {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
};

// I had to turn this to async as using a pasteObserver was not enough for some tests
// export async function simulatePaste(
//   text: string,
//   element: any,
//   delay?: number,
// ): Promise<void> {
//   return new Promise((resolve) => {
//     const event = new Event("paste", {
//       bubbles: true,
//       cancelable: true,
//     });
//
//     event.clipboardData = {
//       getData: function (type: any) {
//         if (type === "text/plain") {
//           return text;
//         }
//         return "";
//       },
//     };
//     element.dispatchEvent(event);
//     setTimeout(
//       () => {
//         resolve();
//       },
//       delay ? delay : 0,
//     );
//   });
// }

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

export type Metric = {
  name: string;
  value: number;
};

export function calcAverageMetrics(perfArray: Metric[]) {
  const sumArr: Record<string, number> = {};
  const counter: Record<string, number> = {};

  // Aggregate values and count occurrences
  perfArray.forEach((metric) => {
    if (sumArr.hasOwnProperty(metric.name)) {
      sumArr[metric.name] += metric.value;
      counter[metric.name] += 1;
    } else {
      sumArr[metric.name] = metric.value;
      counter[metric.name] = 1;
    }
  });

  return Object.keys(sumArr).map((key) => {
    return {
      name: key,
      value: sumArr[key] / counter[key],
    };
  });
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const relevantMetrics = [
  // "ScriptDuration",
  "JSHeapUsedSize",
  // "ProcessTime",
  // "LayoutCount",
  // "ThreadTime",
  // "JSHeapTotalSize",
  // "TaskDuration",
  // "TaskOtherDuration",
  // "DevToolsCommandDuration",
];