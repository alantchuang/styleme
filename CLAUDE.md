# CLAUDE.md — StyleMe Web App (v2.0)

## Document version matrix

| Document               | Version | Last updated |
|------------------------|---------|--------------|
| PRD                    | v1.6    | March 2026   |
| Tech Spec              | v2.0    | March 2026   |
| UX Spec                | v1.6    | March 2026   |
| Prompt Templates       | v1.1    | March 2026   |
| Build Order            | v2.2    | March 2026   |
| Environment Bootstrap  | v2.1    | March 2026   |
| CLAUDE.md              | v2.5    | March 2026   |

If a version doesn't match, the doc is stale — flag it before proceeding.

---

## Where to find the docs

| File | When to read |
|------|-------------|
| `docs/TechSpec.md` | Data model, Convex schema, function contract, data flows |
| `docs/UXSpec.md` | Screen layouts, component hierarchy, interaction states, copy strings |
| `docs/BuildOrder.md` | Current milestone scope and acceptance criteria |
| `docs/PromptTemplates.md` | All Claude prompt text — read before touching `/lib/claude.ts` |
| `docs/EnvironmentBootstrap.md` | Local setup, Convex + Clerk commands |
| `docs/PRD.md` | Product goals, user segments, feature scope |

**Claude Code Desktop reads this file automatically** when launched from the project root directory — no manual reference needed. If using the web version, reference it explicitly at the start of each session.

**Start every session with the docs listed in the `References:` line of your current milestone in `docs/BuildOrder.md`.**

---

## Project overview

StyleMe is a Next.js 14 (App Router) web app — AI-powered wardrobe assistant with a Tinder-style swipe interface. Every swipe trains a personal preference model. A Shopping tab surfaces wardrobe gaps with Google Shopping links.

- **Stack:** Next.js 14 + Tailwind CSS + Convex + Clerk + Claude API (claude-sonnet-4-6) + react-spring
- **Minimum user age:** 13 (enforced in `createUser` Convex mutation — no under-13 flow)
- **Backend:** All DB operations and external API calls go through Convex functions in `/convex/`
- **No Next.js API routes** except `GET /api/health`

---

## Navigation

```
Bottom nav: Closet | Outfits | Saved | Shopping
```

- "Closet" is the tab label for the wardrobe screen (route stays `/(app)/wardrobe`)
- Profile is a slide-over panel opened by the account icon in AppHeader — **NOT a nav tab**.

---

## Key data flows

### 1. Outfit generation lifecycle

1. Outfits page mounts → `useQuery(api.users.getProfile)` → read `contextMode`
2. `useAction(api.weather.get)` → returns `{ condition, tempC, needsLocation }`
3. If `needsLocation: true` → show amber location banner above ColdStartPicker (do not block generation)
4. If `contextMode = 'cold_start'` → render `ColdStartPicker`
5. User selects occasion → taps "Generate outfits" → set `isGenerating = true` → show 3 skeleton cards + rotating `OUTFIT_LOADING_MESSAGES` (cycles every 1.8s, 200ms fade, loops)
6. `useAction(api.outfits.generate)` with `{ occasion, weatherCondition, weatherTempC }`
7. Convex action: apply season filter → truncate to 40 items → build Claude prompt → call Claude
8. Claude returns 5 outfits → validate → insert into `outfits` table → return denormalised batch
9. `isGenerating = false` → render `SwipeStack`

### 2. Swipe → preference recalc → next batch

1. User swipes → `isSwiping = true`
2. `useMutation(api.swipes.record)` with `{ outfitId, liked }`
3. Mutation: insert `outfitSwipes` → increment `totalSwipes` → check graduation → patch user doc atomically
4. If `newTotal >= 20` → `contextMode = 'auto_detect'` written to user doc
5. `useQuery(api.users.getProfile)` is reactive — components reading `contextMode` auto-update
6. `isSwiping = false`
7. If `newTotal % 5 === 0` → `ctx.scheduler.runAfter(0, api.preferences.recalculate)` fires async
8. After 5th swipe in batch → show 3 skeleton cards + rotating `OUTFIT_LOADING_MESSAGES` → call `api.outfits.generate` again

### 3. Shopping cache invalidation

1. Wardrobe upload or swipe recorded → mutation patches `user.shoppingCacheInvalid = true`
2. User opens Shopping tab → `useQuery(api.shopping.list)` is reactive
3. Query checks `shoppingCacheInvalid` → returns `{ isStale: true }` immediately with current gaps
4. Frontend immediately removes all gap cards, hides WardrobeSnapshot bar and filter pills, shows `SHOPPING_LOADING_STEPS` animated thinking steps (▸ active / ✓ completed, 2s per step, loops). **Never show stale cards at reduced opacity.**
5. Frontend calls `useAction(api.shopping.regenerate)` async — Action: fetch wardrobe + preferences → call Claude → upsert `shoppingGaps` → patch `shoppingCacheInvalid = false`
6. `useQuery(api.shopping.list)` auto-updates — shopping tab refreshes without manual refetch

### 4. Profile photo → outfit suggestion

1. User uploads photo → `useAction(api.users.uploadPhoto)`
2. Action: resize to max 600px → `ctx.storage.store()` → get URL
3. Call Claude `PHOTO_SUMMARY_SYSTEM` prompt → store result in `user.profilePhotoSummary`
4. All future `api.outfits.generate` calls include `profilePhotoSummary` as text — photo never resent
5. If summary fails: store `'Appearance not available'` — action still succeeds

### 5. Onboarding completion

1. Step 1: Clerk sign-up + DOB → Clerk webhook calls `api.users.createUser` mutation → validates age >= 13
2. Step 2a: `api.users.uploadPhoto` (if photo provided) + `api.users.updateProfile`
3. Step 2b: `api.users.updateProfile` with `bodySilhouette` and `fitPreferences`
4. Step 3: `api.users.updateProfile` with `stylePreferences`
5. Step 4: `api.wardrobe.upload` (or skip)
6. Navigate to `/(app)/outfits` — `contextMode = 'cold_start'` → ColdStartPicker shown

---

## Error handling philosophy

1. **Loading** → skeleton placeholders (`bg-slate-100 animate-pulse rounded-2xl`) — never blank
2. **Error** → friendly error card + "Try again" button — never raw error strings to users
3. **Retry** → one retry. If retry fails → surface error card
4. **Logging** → `console.error` at every catch: function name + userId + error message
5. Never throw unhandled promise rejections

| Scenario | Behaviour |
|---|---|
| Convex action slow (>5s) | Progress indicator + "Taking a little longer..." after 3s — **exception:** outfit generation and shopping regeneration already show their own rotating/sequential progress UI; the "Taking a little longer..." indicator does not apply to those two flows |
| Convex action fails | Retry once → if second fails → friendly error card |
| Weather fails | Return `{ condition: null, tempC: null }` — never block, never show error |
| Convex offline | `connectionState = 'Connecting'` → amber banner. Mutations queue automatically. |

---

## Error and edge case catalog

**`api.wardrobe.upload`**
- Claude returns invalid category → store `'accessories'`, log warning
- No `dominantColourHex` → derive from `colours[0]`
- 200 active item limit → throw `wardrobe_full`
- After insert: `shoppingCacheInvalid: true`

**`api.outfits.generate`**
- 0 items after season filter → throw `no_wardrobe_items`
- 1–2 items → proceed, Claude may reuse items — acceptable
- Claude returns 4 outfits → insert all 4, log warning — do not retry
- Claude returns 6+ → truncate to 5
- Claude references unknown item ID → strip; if < 3 valid outfits remain → return with `isPartial: true`
- Weather null → pass `"Weather: not available"` — do not block

**`api.swipes.record`**
- Double-swipe race condition → both inserts succeed — acceptable noise
- Preference recalc scheduled async — failure logged, never surfaced to user

**`api.users.uploadPhoto`**
- Claude summary fails → store photo, set summary `'Appearance not available'`, return success

**`api.shopping.regenerate`**
- < 10 swipes or 0 items → return `{ gapsGenerated: 0 }` — no Claude call
- Claude > 6 gaps → truncate to 6
- Unknown `compatibleItemIds` → strip

---

## Image handling

**Wardrobe item photos** (in `api.wardrobe.upload`):
- Resize server-side in the Convex action using sharp (bundled as a Node.js dependency)
- Max 1200px longest side, JPEG quality 85
- Max input: 20MB. Allowed: `image/jpeg`, `image/png`, `image/webp`
- Stored via `ctx.storage.store()` — URL is permanent (no expiry unlike Supabase signed URLs)

**Profile photos** (in `api.users.uploadPhoto`):
- Max 600px longest side, JPEG quality 85
- Max input: 10MB
- Stored via `ctx.storage.store()` — overwrites previous on re-upload

**Client-side:**
- Show preview with `URL.createObjectURL`
- Validate MIME type and file size — show friendly error if invalid
- Send raw `ArrayBuffer` to the Convex action — do not resize client-side

---

## API rate limiting and retry strategy

**Convex actions (Claude/Open-Meteo calls):**
```typescript
for (let attempt = 0; attempt < 2; attempt++) {
  try {
    return await callClaude(...);
  } catch (err) {
    if (attempt === 1) throw err;
    await new Promise(r => setTimeout(r, 1000));
  }
}
```

**Convex mutations:**
- Convex queues mutations automatically when offline and replays on reconnect
- No manual queue needed — this is handled by the Convex client library

**Frontend debouncing:**
- `isGenerating: boolean` — prevents duplicate `api.outfits.generate` calls
- `isSwiping: boolean` — prevents duplicate `api.swipes.record` calls
- Disable action buttons while request is in flight

---

## Profile photo — analyse once pattern

Photo is analysed once on upload. `profilePhotoSummary` (text) is used in all outfit calls.

```
Upload → resize → ctx.storage.store() → Claude analysis → store text summary
                                                                    ↓
                                          All outfit calls use text summary only
```

---

## Weather — always auto-detected

- **Provider:** Open-Meteo — free, no API key required
- **Called by:** Outfits page parent via `useAction(api.weather.get)`
- **Cache:** `user.weatherCache` (field on Convex user document) — stale after 30 minutes
- **Location priority:** lat/lng (from browser geolocation) → city name (manual entry) → null
- **Returns `needsLocation: true`** when both `locationLat`/`locationLng` and `locationCity` are null — frontend shows amber location banner above ColdStartPicker
- **Failure:** Returns `{ condition: null, tempC: null }` — never throws, never blocks
- **Claude prompt when null:** `"Weather: not available"` — Claude uses season + wardrobe tags

---

## ColdStartPicker — occasion only

```
Chips: Casual | Work | Date night | Gym | Travel | Smart casual | Other
Default: Casual (user's local timezone — not server UTC)
```

**Mandatory subtitle:** `"We'll handle the weather automatically"` — do not remove.

**"Other" chip:**
- Reveals free-text input, max 80 chars, auto-focus, slide-down animation
- Sanitise: `.trim().replace(/\s+/g, ' ').slice(0, 80)`
- CTA disabled until >= 2 non-whitespace characters
- Tapping any other chip: collapses and clears input

**DO NOT add:** weather tiles, temperature slider, or any weather input anywhere.

**ContextOverrideSheet:**
- Same occasion chips + Other chip. No weather.
- Subtitle: `"Weather is detected automatically"`
- On "Update outfits": start fresh batch, swiped cards already logged — preference learning preserved

---

## Swipe batch transition

After 5th swipe:
1. Card exits normally
2. 3 skeleton cards (`bg-slate-100 animate-pulse rounded-3xl`) appear immediately
3. `"Refreshing your suggestions..."` below skeletons
4. Action buttons **hidden**, progress dots **hidden**
5. New batch loads in place — no navigation
6. **Cannot go back** — swiped cards are committed
7. On failure: skeleton → error card + "Try again"

---

## context_mode graduation

```
api.swipes.record mutation runs
  → totalSwipes increments
  → if totalSwipes >= 20: contextMode = 'auto_detect' written to user doc
  → useQuery(api.users.getProfile) is reactive — UI auto-updates
  → Next Outfits tab open: ColdStartPicker not rendered
```

**Never** set `contextMode` directly in component code — let the mutation own it.

---

## Outfit generation — wardrobe truncation

Send full wardrobe up to 40 season-filtered items. If > 40:
1. Include items whose `tags` match the current occasion
2. Fill remaining slots with most recently created items
3. `console.warn('Wardrobe truncated', { total, sent: 40 })`

---

## Profile fields

| Field | Type | Notes |
|---|---|---|
| `clerkId` | string | Set by Clerk, used for auth lookup |
| `displayName` | string | |
| `dateOfBirth` | string | ISO — validated >= 13 years at `createUser` |
| `heightCm` | number? | |
| `hairColour` | string? | |
| `hairStyle` | string? | |
| `profilePhotoUrl` | string? | Convex Storage URL |
| `profilePhotoSummary` | string? | Claude-generated ~30 words |
| `stylePreferences` | string[] | |
| `bodySilhouette` | string? | hourglass, rectangle, pear, inverted_triangle, apple, petite |
| `fitPreferences` | string[] | Max 2: oversized, relaxed, fitted, tailored |
| `hemisphere` | string | northern or southern |
| `locationLat` | number? | From browser geolocation |
| `locationLng` | number? | From browser geolocation |
| `locationCity` | string? | Manual city entry — max 100 chars, geocoded at fetch time |
| `weatherCache` | object? | `{ condition: string\|null, tempC: number\|null, cachedAt: number }` — see TechSpec §3 for full schema |
| `preferenceSummary` | object? | Built from swipe history |
| `totalSwipes` | number | Incremented in `api.swipes.record` |
| `contextMode` | string | Updated in `api.swipes.record` |
| `shoppingCacheInvalid` | boolean | Set in wardrobe/swipe mutations |

**Removed:** `weight_kg` — do not add back.

**Illustrations:** Silhouette and fit SVGs are TBD. Use placeholder grey tiles during dev. Do not ship placeholders.

---

---

## Prompt model selection

Different prompts use different models. Never hardcode model strings in Convex function files — use the constants from `/lib/claude.ts`.

| Prompt | Model constant | Model |
|--------|---------------|-------|
| Wardrobe tagging | `HAIKU` | `claude-haiku-4-5-20251001` |
| Outfit generation | `SONNET` | `claude-sonnet-4-6` |
| Preference recalculation | `SONNET` | `claude-sonnet-4-6` |
| Shopping gap analysis | `HAIKU` | `claude-haiku-4-5-20251001` |
| Profile photo summary | `HAIKU` | `claude-haiku-4-5-20251001` |

```typescript
// /lib/claude.ts — define once, import everywhere
export const SONNET = 'claude-sonnet-4-6';
export const HAIKU  = 'claude-haiku-4-5-20251001';
```

## Prompt versioning

Every prompt constant in `/lib/claude.ts` has a version comment on the first line:

```typescript
// PROMPT_VERSION: outfit_generation_v2
export const OUTFIT_GENERATION_SYSTEM = `...`;
```

When a prompt is updated: increment the version, update the comment, update `PromptTemplates.md`. That doc is the source of truth.

---

## Testing strategy

**Tooling:** Vitest (unit tests only). No E2E, no component tests in v1.

| File | Test targets |
|------|-------------|
| `/lib/seasonUtils.ts` | `getCurrentSeason()` all 24 month × hemisphere combinations; `filterBySeason()` edge cases |
| `api.wardrobe.upload` validation | MIME type, file size, 200-item limit |
| `api.outfits.generate` validation | Missing occasion, > 80 chars, 0 items, Claude returns 4, unknown item ID |
| `/lib/preferenceEngine.ts` | Merge logic, array truncation to max 5 |
| Occasion sanitisation | trim, collapse spaces, truncate, `isValid` |
| `api.weather.get` cache logic | Returns cached if < 30min; fetches fresh if stale; returns null on failure |

**Coverage target:** > 80% on `seasonUtils.ts`. No coverage target for Convex functions (integration tested via AC).

---

## Tailwind conventions

> Design system: **Aura Elan** — light mode, editorial. Uses Material Design 3 semantic tokens in `tailwind.config.js`. See UXSpec §1 for full token set.

| Element | Classes |
|---|---|
| Primary button | `bg-primary text-on-primary rounded-full px-6 py-3 text-sm font-medium active:scale-[0.98]` |
| Primary button (gradient) | `bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-full px-6 py-3 text-sm font-medium` |
| Ghost button | `border border-outline-variant bg-surface-container-lowest text-on-surface rounded-full px-6 py-3 text-sm` |
| Selected tile | `border-2 border-primary bg-primary-container` |
| Unselected tile | `border border-outline-variant bg-surface-container-lowest` |
| Offline banner | `bg-amber-50 border-b border-amber-200 text-amber-800` |
| Skeleton | `bg-surface-container-high animate-pulse rounded-2xl` |

---

## Git workflow

StyleMe uses a **branch-per-milestone** pattern. One branch per milestone, one PR to merge into `main` when all ACs pass.

### Branch naming
```
milestone/1-scaffold
milestone/2-schema
milestone/3-wardrobe
milestone/4-outfits
milestone/5-preferences
milestone/6-shopping
milestone/7-onboarding
milestone/8-polish
milestone/9-production
milestone/10-design
milestone/11-privacy
```

### Per-milestone workflow
```bash
# 1. Start of each milestone — create branch from main
git checkout main && git pull
git checkout -b milestone/N-name

# 2. Claude Code implements the milestone
#    (multiple commits during implementation are fine)

# 3. When all ACs pass — clean up and open PR
git add .
git commit -m "feat: milestone N — short description"
gh pr create --title "Milestone N — name" --body "All ACs verified."

# 4. Review diff on GitHub, merge PR
# 5. Delete branch after merge
git branch -d milestone/N-name
```

### Commit messages during implementation
Use conventional commits — Claude Code should follow this format:
- `feat:` new functionality
- `fix:` bug fixes
- `chore:` config, deps, tooling
- `test:` adding or fixing tests

### Rules
- **Never push directly to `main`** — always via PR
- **One PR per milestone** — keep diffs focused and reviewable
- **main is always deployable** — only merge when ACs pass
- **Exception: M9** — merge to main only after full production readiness check

---



## Gotchas

- Always work on a `milestone/N-name` branch — never commit directly to `main`
- Use `gh pr create` to open a PR when all ACs pass — do not merge without review
- `useQuery` is reactive — components auto-update when Convex data changes; no manual refetch needed
- `contextMode` is read from `useQuery(api.users.getProfile)` — not from swipe response
- `imageUrl` from Convex Storage is permanent — no expiry (unlike Supabase signed URLs)
- Convex mutations queue offline automatically — no manual queue needed
- `bodySilhouette` stored as snake_case in schema (`inverted_triangle` not "Inverted triangle")
- `fitPreferences` always an array — `['relaxed']` not `'relaxed'`
- sharp must run in the Node.js runtime — add `"use node";` as the **very first line** of any Convex function file that imports sharp (`convex/wardrobe.ts`, `convex/users.ts`). Without it, Convex runs in its default edge runtime where native modules are unavailable. See EnvironmentBootstrap.md troubleshooting for the full config.
- Clerk age gate runs in `api.users.createUser` mutation — not in the Clerk dashboard
- Season filter uses user's **local timezone** for month calculation — not server UTC
- `profilePhotoSummary` re-generated on every new photo upload
- Convex `_id` fields are `Id<"tableName">` type — not plain strings
- `ctx.scheduler.runAfter(0, fn, args)` schedules async work — does not block mutation return
- Build Order has **10 milestones**: M2 is now Convex schema (no SQL), M9 includes Convex Cloud deploy, M10 is the Aura Elan design system
- **Hemisphere is derived, never entered by the user** — use `hemisphereFromLat(user.locationLat)` from `lib/seasonUtils.ts`. `locationLat` is already captured for weather. Do not add a hemisphere field to any form or mutation arg.
- **BottomNav is a floating pill at `bottom-6`** — not a full-width bar. The pill sits ~76px above the bottom edge (24px gap + ~52px pill height). Any FAB or sticky action bar must use `bottom-24` / `pb-28` to clear it. Do not use `fixed bottom-0` for anything — it will sit behind or below the pill.
- **ConvexError codes from mutations** — extract the error code with `(err as { data?: { code?: string } })?.data?.code`. The code lives on `err.data.code`, not `err.message`. Always check this before showing a generic fallback message.
- **Pre-populated form fields re-trigger server validation** — when a form pre-populates from a query and sends all fields back on save, server validators (e.g. `validateAge`) re-run even on unchanged values. Only send a field to the mutation if it has actually changed: `dateOfBirth && dateOfBirth !== profile?.dateOfBirth ? dateOfBirth : undefined`.
- **Outfit category deduplication** — Claude sometimes includes two items from the same category in one outfit (e.g. two sweaters, two shoes) despite prompt instructions. The validation loop in `convex/outfits.ts` strips duplicates server-side for ALL categories — keep first item per category, filter the rest. Do not narrow this back to shoes-only.
- **Season tags are always exactly one value** — `season_tags` on `wardrobeItems` is always a single-element array: `["summer"]`, `["winter"]`, or `["all-season"]`. Never multi-tag. Enforced server-side in `validateAndNormalise` (`lib/wardrobeValidation.ts`) and in the `wardrobe_tagging_v4` prompt. Do not write code that expects or produces multiple season tags on one item.
- **Outfit composition guardrails** — The outfit generation prompt (`outfit_generation_v7`) enforces strict structural rules. Key points to preserve when editing the prompt: (1) dress exempts the bottom requirement — do not add a bottom when a dress is the hero item; (2) accessories must appear "whenever available"; (3) "NEVER two items from the same category" rule must stay; (4) the pre-return verification checklist ("verify each outfit…") must stay — it was added to catch two-sweater-style errors before Claude returns; (5) the stylist framing opener and gap_suggestion instruction must stay. These were deliberately tightened after observing Claude produce doubled-up category items.
- **Pexels API key must be in Convex env vars, not `.env.local`** — `fetchPexelsImage` (and any future image-fetch helpers) runs inside a Convex action. Only vars set via `npx convex env set PEXELS_API_KEY <key>` are available as `process.env.*` in Convex. `.env.local` is only read by Next.js. Verify with `npx convex env list`.
- **`CLERK_SECRET_KEY` must also be in Convex env vars** — `api.users.deleteAccount` calls the Clerk Backend API (`DELETE https://api.clerk.com/v1/users/{clerkId}`) server-side from a Convex action. Set via `npx convex env set CLERK_SECRET_KEY <key>`. Without it, Convex DB data is deleted but the Clerk account remains.
- **Convex queries must never throw when unauthenticated** — `ConvexProviderWithClerk` fires queries before Clerk's JWT is ready, so any query that calls `getCurrentUser` (which throws `unauthenticated`) will crash the app with an error overlay. Use `getCurrentUserOptional` (defined in `convex/users.ts`) in all `query` handlers — it returns `null` instead of throwing. Only mutations and actions should use `getCurrentUser` (throwing is correct there). Frontend callers already handle `undefined` (loading) so `null` (unauthenticated) is safe.
- **Convex auth uses a server-side token route** — `app/providers.tsx` uses `ConvexProviderWithAuth` with a custom `useServerConvexAuth` hook that fetches the JWT from `/api/convex-token` (a Next.js route handler calling `auth().getToken({ template: "convex" })` server-side). Do NOT revert to `ConvexProviderWithClerk` — Clerk's client-side `getToken` throws `clerk_offline` when `navigator.onLine === false`, which silently breaks all Convex auth. The server-side route bypasses this entirely. The custom hook sets `isLoading: true` until the token arrives, preventing any race condition where queries fire unauthenticated.
- **Sign-out must use `window.location.href`** — `ProfileSheet`'s `handleSignOut` uses `window.location.href = "/sign-in"` (not `router.push`). A full page reload resets the Convex client singleton and Clerk session state. Using `router.push` (client-side navigation) can leave stale auth state that causes the next signed-in user's queries to run unauthenticated.
- **`UserBootstrap` gates new users to onboarding** — `components/UserBootstrap.tsx` reads `useQuery(api.users.getProfile)` and redirects to `/onboarding` if the user has no `stylePreferences`, no `bodySilhouette`, and `onboardingComplete` is not `true`. Existing users who pre-date the `onboardingComplete` flag are exempt via the `stylePreferences.length > 0 || !!bodySilhouette` fallback check.

### E2E / Playwright gotchas

- **Clerk programmatic sign-in (`strategy: 'password'`) triggers device-verification email** when running from a new browser context (Playwright). Use `strategy: 'ticket'` instead: create a sign-in token via `POST https://api.clerk.com/v1/sign_in_tokens` with the Clerk secret key, then pass it to `clerk.signIn({ signInParams: { strategy: 'ticket', ticket: token } })`. This bypasses both device verification and MFA.
- **`clerk.signIn()` from `@clerk/testing` does NOT trigger a page redirect** — call `page.goto('/outfits')` explicitly after it completes.
- **`setupClerkTestingToken` must be called while the page is on the app domain** (`page.goto('/')` first), then navigate to `/sign-in` before calling `clerk.loaded()` and `clerk.signIn()`.
- **Env vars in `.env.local` may have trailing whitespace** — always `.trim()` `E2E_USER_*` values before use.
- **Clerk test account passwords must match `.env.local`** — set them via `PATCH https://api.clerk.com/v1/users/{userId}` with `{ "password": "..." }` using the `CLERK_SECRET_KEY`.
- **Google Shopping URLs opened in Playwright get bot-blocked** (`/sorry/index` redirect) — tests that open Google Shopping should assert on the button's `data-search-url` attribute, not the final loaded page URL.
- **`data-testid` names in filter pills** — when the display label differs from the filter key (e.g. key `"high"` → label `"High priority"`), use the display-derived testid (`filter-high-priority`) not the raw key (`filter-high`). Keep the testid, the label, and the spec selector all in sync.
- **`page.getByText()` in Playwright is case-insensitive by default** — `getByText("Occasions")` will match elements containing "occasions" (lowercase) too, causing strict-mode violations. Scope to a testid (`page.getByTestId("foo").getByText("Occasions")`) or use `{ exact: true }` to match whole-string only.
- **`seed:resetTestUser` must clear outfits as well as wardrobe items and gaps** — any mutation that inserts saved outfits (`seed:insertSavedOutfit`) leaves data that persists across tests. The reset mutation now deletes all `outfits` rows for the user so tests that expect an empty saved tab start clean.
- **Claude sometimes returns prose before the JSON array** — responses like `"Looking at your wardrobe, here are 5 outfits: [...]"` break `JSON.parse`. Always extract the JSON array with a regex (`text.match(/\[[\s\S]*\]/)`) before parsing, rather than only stripping code fences.
