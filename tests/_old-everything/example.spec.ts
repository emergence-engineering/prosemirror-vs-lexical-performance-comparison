import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("localhost:3000/");

  const pm = page.getByText("ProseMirror");
  await expect(pm).toBeVisible();

  const lex = page.getByText("Lexical");
  await expect(lex).toBeVisible();
});
