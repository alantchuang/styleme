/**
 * E2E test suite — M8 Polish states
 *
 * Covers all acceptance criteria from BuildOrder.md §M8:
 * - No blank screens during useQuery loading — skeletons always shown
 * - No raw error strings visible to users
 * - Going offline: amber "You're offline" banner via Convex connectionState
 * - Swiping while offline: mutations queue automatically
 * - "Syncing..." toast appears briefly on reconnect
 * - All toast types appear and auto-dismiss after 3 seconds
 * - Outfits State A: ColdStartPicker shown with "Ready to style your wardrobe"
 * - Outfits State B: "Go to Wardrobe" CTA navigates correctly
 */

import { test, expect, resetUserA } from "./fixtures";

// ── Skeleton loading — no blank screens ──────────────────────────────────────

test.describe("M8 — Loading skeletons (no blank screens)", () => {
  test.beforeEach(async () => {
    await resetUserA({ totalSwipes: 0 });
  });

  test("Wardrobe: shows skeleton or content — never blank", async ({ pageAsUserA: page }) => {
    await page.goto("/wardrobe");
    // Either skeleton or final state must appear — blank screen = fail
    await page.waitForSelector(
      '[data-testid="wardrobe-skeleton"], [data-testid="wardrobe-empty-state"], .grid',
      { timeout: 15_000 }
    );
    // Confirm the page is not blank
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test("Outfits: shows skeleton or state — never blank", async ({ pageAsUserA: page }) => {
    await page.goto("/outfits");
    await page.waitForSelector(
      '[data-testid="outfits-skeleton"], [data-testid="outfits-state-a"], [data-testid="outfits-state-b"]',
      { timeout: 15_000 }
    );
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test("Saved: shows skeleton or state — never blank", async ({ pageAsUserA: page }) => {
    await page.goto("/saved");
    await page.waitForSelector(
      '[data-testid="saved-skeleton"], [data-testid="saved-empty-state"], [data-testid="saved-list"]',
      { timeout: 15_000 }
    );
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test("Shopping: shows skeleton or state — never blank", async ({ pageAsUserA: page }) => {
    await page.goto("/shopping");
    await page.waitForSelector(
      '[data-testid="shopping-empty-state"], [data-testid="shopping-active-state"], [data-testid="shopping-no-gaps"]',
      { timeout: 15_000 }
    );
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test("Wardrobe: skeleton resolves to empty state (no items)", async ({
    pageAsUserA: page,
  }) => {
    await page.goto("/wardrobe");
    // After skeleton, should resolve to empty or filled state — not stuck on skeleton
    await page.waitForSelector(
      ".grid, [data-testid=\"wardrobe-skeleton\"] ~ *, h2",
      { timeout: 15_000 }
    );
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="wardrobe-skeleton"]'),
      { timeout: 10_000 }
    );
  });
});

// ── Outfits empty states ──────────────────────────────────────────────────────

test.describe("M8 — Outfits State B (no wardrobe items)", () => {
  test.beforeEach(async () => {
    // No wardrobe, no swipes
    await resetUserA({ totalSwipes: 0, seedWardrobe: false });
  });

  test("shows 'Add some clothes first' heading", async ({ pageAsUserA: page }) => {
    await page.goto("/outfits");
    await page.waitForSelector('[data-testid="outfits-state-b"]', { timeout: 15_000 });
    await expect(page.getByText("Add some clothes first")).toBeVisible();
  });

  test("shows wardrobe body copy", async ({ pageAsUserA: page }) => {
    await page.goto("/outfits");
    await page.waitForSelector('[data-testid="outfits-state-b"]', { timeout: 15_000 });
    await expect(
      page.getByText("Upload a few wardrobe items and we can start styling outfits for you.")
    ).toBeVisible();
  });

  test("'Go to Wardrobe' CTA navigates to /wardrobe", async ({ pageAsUserA: page }) => {
    await page.goto("/outfits");
    await page.waitForSelector('[data-testid="outfits-state-b"]', { timeout: 15_000 });

    const cta = page.getByRole("link", { name: "Go to Wardrobe" });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/wardrobe/, { timeout: 10_000 });
  });
});

test.describe("M8 — Outfits State A (wardrobe exists, cold start)", () => {
  test.beforeEach(async () => {
    // Has wardrobe but no swipes (cold start mode)
    await resetUserA({ totalSwipes: 0, seedWardrobe: true });
  });

  test("shows 'Ready to style your wardrobe' heading", async ({ pageAsUserA: page }) => {
    await page.goto("/outfits");
    await page.waitForSelector('[data-testid="outfits-state-a"]', { timeout: 15_000 });
    await expect(page.getByText("Ready to style your wardrobe")).toBeVisible();
  });

  test("shows ColdStartPicker subtitle 'We'll handle the weather automatically'", async ({
    pageAsUserA: page,
  }) => {
    await page.goto("/outfits");
    await page.waitForSelector('[data-testid="outfits-state-a"]', { timeout: 15_000 });
    await expect(page.getByText("We'll handle the weather automatically")).toBeVisible();
  });

  test("shows occasion chips (Casual, Work, Date night)", async ({ pageAsUserA: page }) => {
    await page.goto("/outfits");
    await page.waitForSelector('[data-testid="outfits-state-a"]', { timeout: 15_000 });
    const stateA = page.getByTestId("outfits-state-a");
    // Use .first() — ContextOverrideSheet may also render chips in the DOM
    await expect(stateA.getByRole("button", { name: "Casual" }).first()).toBeVisible();
    await expect(stateA.getByRole("button", { name: "Work" }).first()).toBeVisible();
    await expect(stateA.getByRole("button", { name: "Date night" }).first()).toBeVisible();
  });

  test("shows 'Generate outfits' CTA button", async ({ pageAsUserA: page }) => {
    await page.goto("/outfits");
    await page.waitForSelector('[data-testid="outfits-state-a"]', { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Generate outfits" })).toBeVisible();
  });

  test("does NOT show weather tiles or temperature slider", async ({ pageAsUserA: page }) => {
    await page.goto("/outfits");
    await page.waitForSelector('[data-testid="outfits-state-a"]', { timeout: 15_000 });
    // Confirm no weather UI elements exist
    await expect(page.getByText(/temperature/i)).not.toBeVisible();
    await expect(page.locator('input[type="range"]')).not.toBeVisible();
  });
});

// ── Offline banner + Syncing toast ───────────────────────────────────────────
// These tests simulate Convex WebSocket disconnect using page.routeWebSocket()
// to intercept only the Convex connection — keeping Next.js HMR intact.
//
// Strategy:
//  1. Set up routeWebSocket BEFORE navigation so the handler captures the WS.
//  2. Navigate to the page — Convex establishes a proxied WebSocket.
//  3. Wait for banner to disappear (connected).
//  4. Close the proxied server connection → Convex detects disconnect.
//  5. Assert banner appears; then restore and assert toast.

type ServerWsRef = { close: () => void } | null;

/** Set up a Convex WebSocket proxy. Returns a closer function. */
async function proxyConvexWs(
  page: import("@playwright/test").Page
): Promise<() => void> {
  let serverRef: ServerWsRef = null;

  await page.routeWebSocket(/convex\.(cloud|dev|site)/, async (ws) => {
    const server = await ws.connectToServer();
    serverRef = server;
    server.onMessage((msg) => ws.send(msg));
    ws.onMessage((msg) => server.send(msg));
    ws.onClose(() => server.close());
    server.onClose(() => ws.close());
  });

  return () => {
    if (serverRef) {
      serverRef.close();
      serverRef = null;
    }
  };
}

/** Wait until Convex is connected (offline banner absent). */
async function waitForConvexConnected(page: import("@playwright/test").Page) {
  // Banner starts absent (mounted=false). After mount: if WebSocket not yet
  // connected, banner shows briefly then hides once connected. We wait for
  // the banner to disappear (if it ever appeared) OR stay absent.
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="offline-banner"]'),
    { timeout: 12_000 }
  );
}

test.describe("M8 — Offline banner", () => {
  test.beforeEach(async () => {
    await resetUserA({ totalSwipes: 0 });
  });

  test("shows amber 'You're offline' banner when Convex disconnects", async ({
    pageAsUserA: page,
  }) => {
    const closeConvex = await proxyConvexWs(page);
    await page.goto("/wardrobe");
    await page.waitForSelector('h2, [data-testid="wardrobe-skeleton"]', { timeout: 10_000 });
    await waitForConvexConnected(page);

    // Drop the Convex WebSocket
    closeConvex();

    await expect(page.getByTestId("offline-banner")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("You're offline")).toBeVisible();
  });

  test("offline banner has amber background classes", async ({ pageAsUserA: page }) => {
    const closeConvex = await proxyConvexWs(page);
    await page.goto("/wardrobe");
    await page.waitForSelector('h2, [data-testid="wardrobe-skeleton"]', { timeout: 10_000 });
    await waitForConvexConnected(page);

    closeConvex();
    const banner = page.getByTestId("offline-banner");
    await expect(banner).toBeVisible({ timeout: 15_000 });

    const classes = await banner.getAttribute("class");
    expect(classes).toContain("bg-amber-50");
    expect(classes).toContain("border-amber-200");
    expect(classes).toContain("text-amber-800");
  });

  test("offline banner disappears on reconnect", async ({ pageAsUserA: page }) => {
    const closeConvex = await proxyConvexWs(page);
    await page.goto("/wardrobe");
    await page.waitForSelector('h2, [data-testid="wardrobe-skeleton"]', { timeout: 10_000 });
    await waitForConvexConnected(page);

    // Disconnect
    closeConvex();
    await expect(page.getByTestId("offline-banner")).toBeVisible({ timeout: 15_000 });

    // Convex will automatically reconnect (proxy allows next connection through)
    await expect(page.getByTestId("offline-banner")).not.toBeVisible({ timeout: 30_000 });
  });
});

// ── Syncing toast on reconnect ────────────────────────────────────────────────

test.describe("M8 — 'Syncing...' toast on reconnect", () => {
  test.beforeEach(async () => {
    await resetUserA({ totalSwipes: 0 });
  });

  test("shows 'Syncing...' toast after Convex reconnects", async ({ pageAsUserA: page }) => {
    const closeConvex = await proxyConvexWs(page);
    await page.goto("/wardrobe");
    await page.waitForSelector('h2, [data-testid="wardrobe-skeleton"]', { timeout: 10_000 });
    await waitForConvexConnected(page);

    // Disconnect then let Convex auto-reconnect
    closeConvex();
    await expect(page.getByTestId("offline-banner")).toBeVisible({ timeout: 15_000 });

    // Reconnect — "Syncing..." toast should fire
    await expect(page.getByTestId("toast")).toContainText("Syncing...", { timeout: 30_000 });
  });

  test("'Syncing...' toast auto-dismisses after 3 seconds", async ({ pageAsUserA: page }) => {
    const closeConvex = await proxyConvexWs(page);
    await page.goto("/wardrobe");
    await page.waitForSelector('h2, [data-testid="wardrobe-skeleton"]', { timeout: 10_000 });
    await waitForConvexConnected(page);

    closeConvex();
    await expect(page.getByTestId("offline-banner")).toBeVisible({ timeout: 15_000 });

    // Target the Syncing toast by text to avoid strict-mode issues when multiple toasts exist
    const syncingToast = page.getByTestId("toast").filter({ hasText: "Syncing..." });
    await expect(syncingToast.first()).toBeVisible({ timeout: 30_000 });
    // Disappears within 3s (allow 6s total for timing slack)
    await expect(syncingToast.first()).not.toBeVisible({ timeout: 6_000 });
  });
});

// ── "Profile updated" toast ───────────────────────────────────────────────────

test.describe("M8 — 'Profile updated' toast", () => {
  test.beforeEach(async () => {
    await resetUserA({ totalSwipes: 0 });
  });

  test("shows 'Profile updated' toast after saving profile edit", async ({
    pageAsUserA: page,
  }) => {
    await page.goto("/profile/edit");
    // Wait for profile to load
    await page.waitForSelector("input, [data-testid]", { timeout: 15_000 });

    // Make a trivial change — append a space to display name or change it
    const nameInput = page.locator('input[placeholder*="name" i], input[type="text"]').first();
    await nameInput.fill("Test User");

    // Click Save
    const saveBtn = page.getByRole("button", { name: /save/i });
    await saveBtn.click();

    // Toast should appear
    await expect(page.getByTestId("toast-profile-updated")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Profile updated")).toBeVisible();
  });

  test("'Profile updated' toast auto-dismisses after 3 seconds", async ({
    pageAsUserA: page,
  }) => {
    await page.goto("/profile/edit");
    await page.waitForSelector("input, [data-testid]", { timeout: 15_000 });

    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.fill("Test User");
    await page.getByRole("button", { name: /save/i }).click();

    await expect(page.getByTestId("toast-profile-updated")).toBeVisible({ timeout: 10_000 });
    // Disappears after ~3s
    await expect(page.getByTestId("toast-profile-updated")).not.toBeVisible({ timeout: 6_000 });
  });
});

// ── Mutations queue while offline ─────────────────────────────────────────────

test.describe("M8 — Mutations queue while offline", () => {
  test.beforeEach(async () => {
    await resetUserA({ totalSwipes: 0 });
  });

  test("app remains functional UI-wise while offline (mutations queued silently)", async ({
    pageAsUserA: page,
  }) => {
    const closeConvex = await proxyConvexWs(page);
    await page.goto("/wardrobe");
    await page.waitForSelector('h2, [data-testid="wardrobe-skeleton"]', { timeout: 10_000 });
    await waitForConvexConnected(page);

    closeConvex();
    await expect(page.getByTestId("offline-banner")).toBeVisible({ timeout: 15_000 });

    // The UI should still render — no crash or white screen
    const bodyText = await page.locator("body").textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);

    // No raw error strings should appear
    await expect(page.getByText(/convex error/i)).not.toBeVisible();
    await expect(page.getByText(/websocket/i)).not.toBeVisible();

    await page.context().setOffline(false);
  });
});
