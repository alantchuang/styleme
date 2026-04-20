/**
 * Playwright test fixtures for StyleMe E2E tests.
 * Uses @clerk/testing/playwright for auth and ConvexHttpClient for data seeding.
 */
import { test as base, expect, Page } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { spawnSync } from "child_process";

// ── Convex CLI helper ─────────────────────────────────────────────────────────

/**
 * Call a Convex internal mutation via the Convex CLI (for seed/reset operations).
 * Requires `npx convex dev` to be running and CONVEX_DEPLOYMENT set in .env.local.
 */
export function callConvexMutation(
  functionPath: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = spawnSync(
    "npx",
    ["convex", "run", functionPath, JSON.stringify(args)],
    { encoding: "utf8", env: { ...process.env } }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`convex run ${functionPath} failed:\n${result.stderr}`);
  }
  return Promise.resolve(JSON.parse(result.stdout.trim()));
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Create a Clerk sign-in token for the given userId via the Backend API.
 * This token bypasses password auth and device verification — ideal for E2E tests.
 */
async function createClerkSignInToken(userId: string): Promise<string> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY not set");

  const res = await fetch("https://api.clerk.com/v1/sign_in_tokens", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 300 }),
  });
  if (!res.ok) throw new Error(`Clerk sign-in token creation failed: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error(`No token in Clerk response: ${JSON.stringify(data)}`);
  return data.token;
}

/**
 * Sign in a user via Clerk using a sign-in token (bypasses password + device verification).
 * userId is the Clerk user ID (e.g. user_XXXXXXXXXXXXXXXXXXXXXXXXXXXX).
 */
export async function signIn(
  page: Page,
  _email: string,
  _password: string,
  userId: string
): Promise<void> {
  const token = await createClerkSignInToken(userId);

  // setupClerkTestingToken must be called while on a page in our app domain
  await page.goto("/");
  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.loaded({ page });
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "ticket",
      ticket: token,
    },
  });
  // Session is now set — navigate to the app
  await page.goto("/outfits");
  await page.waitForURL(/\/(wardrobe|outfits|saved|shopping)/, { timeout: 20_000 });
}

/**
 * Sign out the current user.
 */
export async function signOut(page: Page): Promise<void> {
  await clerk.signOut({ page });
}

// ── Reset helpers ─────────────────────────────────────────────────────────────

/** Reset User A to a clean state for testing. */
export async function resetUserA(
  opts: {
    totalSwipes?: number;
    shoppingCacheInvalid?: boolean;
    seedWardrobe?: boolean;
    seedGaps?: boolean;
  } = {}
): Promise<unknown> {
  const clerkId = process.env.E2E_USER_A_CLERK_ID;
  if (!clerkId) throw new Error("E2E_USER_A_CLERK_ID not set");
  return callConvexMutation("seed:resetTestUser", { clerkId, ...opts });
}

/** Reset User B to a clean state for testing. */
export async function resetUserB(
  opts: {
    totalSwipes?: number;
    shoppingCacheInvalid?: boolean;
    seedWardrobe?: boolean;
    seedGaps?: boolean;
  } = {}
): Promise<unknown> {
  const clerkId = process.env.E2E_USER_B_CLERK_ID;
  if (!clerkId) throw new Error("E2E_USER_B_CLERK_ID not set");
  return callConvexMutation("seed:resetTestUser", { clerkId, ...opts });
}

// ── Custom test fixtures ──────────────────────────────────────────────────────

type Fixtures = {
  /** Page signed in as User A */
  pageAsUserA: Page;
  /** Page signed in as User B */
  pageAsUserB: Page;
};

export const test = base.extend<Fixtures>({
  pageAsUserA: async ({ page }, use) => {
    const email = process.env.E2E_USER_A_EMAIL?.trim() ?? "";
    const password = process.env.E2E_USER_A_PASSWORD?.trim() ?? "";
    const userId = process.env.E2E_USER_A_CLERK_ID;
    if (!userId) throw new Error("E2E_USER_A_CLERK_ID not set");
    await signIn(page, email, password, userId);
    await use(page);
    await signOut(page).catch(() => {});
  },

  pageAsUserB: async ({ page }, use) => {
    const email = process.env.E2E_USER_B_EMAIL?.trim() ?? "";
    const password = process.env.E2E_USER_B_PASSWORD?.trim() ?? "";
    const userId = process.env.E2E_USER_B_CLERK_ID;
    if (!userId) throw new Error("E2E_USER_B_CLERK_ID not set");
    await signIn(page, email, password, userId);
    await use(page);
    await signOut(page).catch(() => {});
  },
});

export { expect };
