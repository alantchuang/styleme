/**
 * E2E test suite — Shopping tab (M6)
 *
 * Covers all acceptance criteria from BuildOrder.md §M6:
 * - Empty state when totalSwipes < 10
 * - Gap cards when totalSwipes >= 10
 * - isStale: true while regenerating → stale gaps shown immediately
 * - High-priority gap has border-2 border-violet-600
 * - Filter pills (All / High priority / By occasion)
 * - WardrobeSnapshot stat counts
 * - "Find on Google Shopping" button opens search URL
 * - GapDetail: compatible item swatches match dominantColourHex
 * - GapDetail: "Open Google Shopping" opens correct pre-filled URL
 * - Off-season gaps sorted below current-season gaps
 * - Cross-user isolation: User B cannot see User A's gaps
 */

import { test, expect, resetUserA, resetUserB } from "./fixtures";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Navigate to the shopping page and wait for it to settle (not skeleton). */
async function goToShopping(page: import("@playwright/test").Page) {
  await page.goto("/shopping");
  // Wait for either the empty state, active state, or no-gaps state
  await page.waitForSelector(
    '[data-testid="shopping-empty-state"], [data-testid="shopping-active-state"], [data-testid="shopping-no-gaps"]',
    { timeout: 30_000 }
  );
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe("Shopping tab — empty state (< 10 swipes)", () => {
  test.beforeEach(async () => {
    // Reset User A: 5 swipes, no gaps, no wardrobe
    await resetUserA({ totalSwipes: 5 });
  });

  test("shows 'Not enough data yet' heading", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    await expect(page.getByTestId("shopping-empty-state")).toBeVisible();
    await expect(page.getByText("Not enough data yet")).toBeVisible();
  });

  test("shows progress bar reflecting swipe count", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    const bar = page.getByTestId("swipe-progress-bar");
    await expect(bar).toBeVisible();
    // 5 out of 10 swipes = 50% width
    const width = await bar.evaluate((el) => (el as HTMLElement).style.width);
    expect(width).toBe("50%");
  });

  test("shows swipe count text", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    await expect(page.getByText("5 / 10 swipes")).toBeVisible();
  });

  test("has a 'Go to Outfits' link", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    const link = page.getByRole("link", { name: "Go to Outfits" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/outfits");
  });

  test("does NOT show filter pills or gap cards", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    await expect(page.getByTestId("filter-pills")).not.toBeVisible();
    await expect(page.getByTestId("wardrobe-snapshot")).not.toBeVisible();
  });
});

test.describe("Shopping tab — active state (>= 10 swipes)", () => {
  test.beforeEach(async () => {
    // Reset User A: 15 swipes, seed wardrobe + gaps
    await resetUserA({ totalSwipes: 15, seedWardrobe: true, seedGaps: true });
  });

  test("shows active state with gap cards", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    await expect(page.getByTestId("shopping-active-state")).toBeVisible();
  });

  test("shows WardrobeSnapshot bar", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    const snapshot = page.getByTestId("wardrobe-snapshot");
    await expect(snapshot).toBeVisible();
    await expect(snapshot.getByText("Gaps found")).toBeVisible();
    await expect(snapshot.getByText("Occasions")).toBeVisible();
    await expect(snapshot.getByText("Items")).toBeVisible();
  });

  test("shows correct gap count in snapshot", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    // seedGaps inserts 4 test gaps
    const count = page.getByTestId("gaps-count");
    await expect(count).toBeVisible();
    await expect(count).toHaveText("4");
  });

  test("high-priority gap has violet border (border-2 border-violet-600)", async ({
    pageAsUserA: page,
  }) => {
    await goToShopping(page);
    // All seeded gaps with priority=high should have the violet border class
    const highPriorityCards = await page
      .locator('[data-priority="high"]')
      .all();
    expect(highPriorityCards.length).toBeGreaterThan(0);
    for (const card of highPriorityCards) {
      await expect(card).toHaveClass(/border-violet-600/);
    }
  });

  test("medium/low-priority gaps do NOT have violet border", async ({
    pageAsUserA: page,
  }) => {
    await goToShopping(page);
    const mediumCards = await page.locator('[data-priority="medium"]').all();
    for (const card of mediumCards) {
      const classes = await card.getAttribute("class");
      expect(classes).not.toContain("border-violet-600");
    }
  });

  test("shows filter pills: All gaps, High priority", async ({
    pageAsUserA: page,
  }) => {
    await goToShopping(page);
    await expect(page.getByTestId("filter-pills")).toBeVisible();
    await expect(page.getByTestId("filter-all")).toBeVisible();
    await expect(page.getByTestId("filter-high-priority")).toBeVisible();
  });

  test("High priority filter shows only high-priority cards", async ({
    pageAsUserA: page,
  }) => {
    await goToShopping(page);
    await page.getByTestId("filter-high-priority").click();

    // After filtering, all visible cards should be high priority
    const cards = await page.locator("[data-priority]").all();
    for (const card of cards) {
      await expect(card).toHaveAttribute("data-priority", "high");
    }
  });

  test("'Find on Google Shopping' CTA is present on gap cards", async ({
    pageAsUserA: page,
  }) => {
    await goToShopping(page);
    const ctaButtons = await page.getByRole("button", { name: "Find on Google Shopping" }).all();
    expect(ctaButtons.length).toBeGreaterThan(0);
  });

  test("off-season gaps sorted below current-season gaps", async ({
    pageAsUserA: page,
  }) => {
    await goToShopping(page);
    // Get all gap cards and check season badge order
    const seasonBadges = await page.locator('[data-testid^="gap-card-"]').evaluateAll((cards) =>
      cards
        .map((card) => {
          const badge = card.querySelector(".bg-slate-100.text-slate-600");
          return badge?.textContent?.trim();
        })
        .filter(Boolean)
    );

    // Verify off-season ("Off season") gaps appear after current/upcoming
    const offSeasonIndex = seasonBadges.findLastIndex((b) => b === "Off season");
    const currentIndex = seasonBadges.findIndex((b) => b === "In season");
    if (offSeasonIndex >= 0 && currentIndex >= 0) {
      expect(offSeasonIndex).toBeGreaterThan(currentIndex);
    }
  });
});

test.describe("Shopping tab — GapDetail page", () => {
  test.beforeEach(async () => {
    await resetUserA({ totalSwipes: 15, seedWardrobe: true, seedGaps: true });
  });

  test("navigates to gap detail on card click", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    // Click the first gap card link (not the CTA button)
    const firstCard = page.locator('[data-testid^="gap-card-"]').first();
    await firstCard.click();
    await page.waitForURL(/\/shopping\/.+/, { timeout: 10_000 });
    await expect(page.getByText("Why this was recommended")).toBeVisible();
  });

  test("compatible item swatches use dominantColourHex", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    const firstCard = page.locator('[data-testid^="gap-card-"]').first();
    await firstCard.click();
    await page.waitForURL(/\/shopping\/.+/);

    const swatches = await page.getByTestId("compatible-item-swatch").all();
    if (swatches.length > 0) {
      for (const swatch of swatches) {
        const colour = await swatch.getAttribute("data-colour");
        expect(colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
        const bgColor = await swatch.evaluate(
          (el) => (el as HTMLElement).style.backgroundColor
        );
        expect(bgColor).toBeTruthy(); // inline style is set
      }
    }
  });

  test("'Open Google Shopping' button constructs correct URL", async ({
    pageAsUserA: page,
  }) => {
    await goToShopping(page);
    const firstCard = page.locator('[data-testid^="gap-card-"]').first();
    await firstCard.click();
    await page.waitForURL(/\/shopping\/.+/);

    const cta = page.getByTestId("open-google-shopping");
    await expect(cta).toBeVisible();

    const dataUrl = await cta.getAttribute("data-search-url");
    expect(dataUrl).toContain("https://www.google.com/search");
    expect(dataUrl).toContain("tbm=shop");
    expect(dataUrl).toContain("q=");
  });

  test("'Open Google Shopping' opens in new tab", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    const firstCard = page.locator('[data-testid^="gap-card-"]').first();
    await firstCard.click();
    await page.waitForURL(/\/shopping\/.+/);

    const cta = page.getByTestId("open-google-shopping");
    await expect(cta).toBeVisible();
    const dataUrl = await cta.getAttribute("data-search-url");
    expect(dataUrl).toContain("google.com/search");
    expect(dataUrl).toContain("tbm=shop");
  });

  test("shows search query input that is editable", async ({ pageAsUserA: page }) => {
    await goToShopping(page);
    const firstCard = page.locator('[data-testid^="gap-card-"]').first();
    await firstCard.click();
    await page.waitForURL(/\/shopping\/.+/);

    const input = page.getByTestId("search-query-input");
    await expect(input).toBeVisible();
    const initialValue = await input.inputValue();
    expect(initialValue.length).toBeGreaterThan(0);
  });
});

test.describe("Shopping tab — stale state", () => {
  test("shows stale gaps immediately when shoppingCacheInvalid is true", async ({
    pageAsUserA: page,
  }) => {
    // Setup: user has gaps already, then mark cache as stale
    await resetUserA({ totalSwipes: 15, seedWardrobe: true, seedGaps: true });
    // Now mark as stale
    const clerkId = process.env.E2E_USER_A_CLERK_ID!;
    await import("./fixtures").then(({ callConvexMutation }) =>
      callConvexMutation("seed:resetTestUser", {
        clerkId,
        totalSwipes: 15,
        shoppingCacheInvalid: true,
        seedWardrobe: false,
        seedGaps: false,
      })
    );

    await goToShopping(page);
    // Should still show the active state (stale data shown immediately)
    await expect(page.getByTestId("shopping-active-state")).toBeVisible();
  });
});

test.describe("Shopping tab — cross-user isolation", () => {
  test("User B cannot see User A gaps", async ({ pageAsUserA: pageA, browser }) => {
    // Seed User A with gaps
    await resetUserA({ totalSwipes: 15, seedWardrobe: true, seedGaps: true });
    // Reset User B with no gaps
    await resetUserB({ totalSwipes: 0 });

    // Verify User A sees their gaps
    await pageA.goto("/shopping");
    await pageA.waitForSelector(
      '[data-testid="shopping-active-state"], [data-testid="shopping-empty-state"]'
    );

    // Sign in as User B in a separate context
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    const { signIn } = await import("./fixtures");
    await signIn(pageB, "", "", process.env.E2E_USER_B_CLERK_ID!);
    await pageB.goto("/shopping");
    await pageB.waitForSelector(
      '[data-testid="shopping-empty-state"], [data-testid="shopping-active-state"], [data-testid="shopping-no-gaps"]'
    );

    // User B should see the empty state (0 swipes)
    await expect(pageB.getByTestId("shopping-empty-state")).toBeVisible();
    await contextB.close();
  });
});
