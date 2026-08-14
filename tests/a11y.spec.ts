import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const publicRoutes = ["/", "/auth"];

for (const route of publicRoutes) {
  test(`accessibilité axe-core: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    const critical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(critical, JSON.stringify(critical.map((v) => v.id))).toEqual([]);
  });
}
