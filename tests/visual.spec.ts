import { test, expect } from "@playwright/test";

const publicRoutes = [
  { name: "landing", path: "/" },
  { name: "auth", path: "/auth" },
];

test.describe("Regression visuelle — pages publiques", () => {
  for (const route of publicRoutes) {
    test(`snapshot ${route.name}`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "networkidle" });
      // Laisser les fonts se charger
      await page.evaluate(() => (document as any).fonts?.ready);
      await page.waitForTimeout(400);
      await expect(page).toHaveScreenshot(`${route.name}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: "disabled",
      });
    });
  }

  test("a11y — header logo a un libellé accessible", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const logo = page.getByRole("link", { name: /E'nvlé Space/i }).first();
    await expect(logo).toBeVisible();
  });
});