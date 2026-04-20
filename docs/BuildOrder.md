# Phased Build Order
**Project:** StyleMe | **Version:** 2.1 | **Date:** March 2026

> **How to use with Claude Code:** Start each session: _"Read CLAUDE.md, then implement Milestone [N] from docs/BuildOrder.md. Stop when all acceptance criteria pass. Do not begin Milestone [N+1]."_

---

## Testing Strategy

StyleMe v1 uses a lightweight testing approach — confidence in critical business logic, not exhaustive coverage.

### Tooling
- **Unit tests:** Vitest — fast, TypeScript-native, zero config with Next.js 14
- **Test files:** co-located with source as `*.test.ts`
- **No E2E testing** in v1 — acceptance criteria serve as manual E2E
- **No component testing** in v1 — UI tested manually against AC
- **Convex functions** are not unit-tested — tested via acceptance criteria

### What to test (unit tests only)

| File | What to test |
|------|-------------|
| `/lib/seasonUtils.ts` | `getCurrentSeason()` for all 24 month × hemisphere combinations; `filterBySeason()` edge cases: empty array, all-season items, < 5 items in category, accessories never filtered |
| `api.wardrobe.upload` validation | MIME type check, file size limit, 200-item limit |
| `api.outfits.generate` validation | Occasion missing, > 80 chars, 0 items, Claude returns 4 outfits, unknown item ID |
| `/lib/preferenceEngine.ts` | Merge doesn't overwrite existing valid preferences; array truncation to max 5 |
| Occasion sanitisation | trim, collapse spaces, truncate to 80 chars, `isValid` checks |
| `api.weather.get` cache logic | Returns cached if < 30 min old; fetches fresh if stale; returns null on failure |

### Coverage expectation
> 80% line coverage on `/lib/seasonUtils.ts`. No target for other files in v1.

### What NOT to test
- Claude API responses — non-deterministic
- Convex queries/mutations — not unit-testable without running Convex
- React components — tested manually against AC

---

## Milestone map

| # | Milestone | What gets built |
|---|-----------|----------------|
| M1 | Project scaffold + auth | Next.js init, Convex init, Clerk setup, login/signup (min age 13), protected routes, nav skeleton |
| M2 | Convex schema | `convex/schema.ts` with all tables, indexes, types, seed helpers |
| M3 | Wardrobe upload + tagging | `api.wardrobe.upload` action (resize + tag), `api.wardrobe.list` query, wardrobe grid UI |
| M4 | Outfit generation + swipe UI | `api.outfits.generate`, `api.weather.get`, occasion-only cold start, 3D card, swipe gestures, batch transition |
| M5 | Preference learning | `api.swipes.record` with graduation logic, `api.preferences.recalculate`, Style DNA display |
| M6 | Shopping tab | `api.shopping.list`, `api.shopping.regenerate`, gap cards, detail screen, Google Shopping CTA |
| M7 | Onboarding + profile | 5-step wizard, age gate, silhouette/fit selectors, photo action, edit profile screen |
| M8 | Polish states | Empty/loading/error states, offline banner (Convex `connectionState`), retry logic, toasts |
| M9 | Production readiness | `npx convex deploy --prod`, Vercel deploy, RLS audit, env validation, health endpoint |
| M10 | Aura Elan design system | Tailwind token config, fonts, AppHeader, BottomNav pill, wardrobe asymmetric grid, Aura Elan outfit card + saved accordion + shopping editorial cards |
| M11 | Privacy & data | `deleteAccount` action, `exportData` query, Privacy & Data screen, privacy policy + terms pages, onboarding consent checkboxes, upload disclosures |

---

## Milestone 1 — Project scaffold + auth

**References:** `CLAUDE.md` (project overview, navigation, Tailwind conventions), `docs/TechSpec.md` §1 (tech stack), §4 (Clerk + Convex auth integration), `docs/EnvironmentBootstrap.md` (all steps)

**Goal:** Running Next.js app with Convex connected, Clerk auth working (min age 13), protected routes, Vitest configured.

### What to build
- Initialise Next.js 14 with TypeScript, Tailwind CSS, App Router
- Install `convex`, `@clerk/nextjs`, `convex/react-clerk` and all other dependencies
- Run `npx convex dev` — creates Convex project and writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local`
- Set up Clerk application — configure publishable key + secret key in `.env.local`
- Set Convex env vars: `CLERK_ISSUER_URL`, `ANTHROPIC_API_KEY`
- `ClerkProvider` + `ConvexProviderWithClerk` wrapping the app in `layout.tsx`
- `/(auth)` — Clerk-powered `/sign-in` and `/sign-up` pages with DOB field
- `/(app)` — protected routes via Clerk middleware
- `middleware.ts` — Clerk `clerkMiddleware` protecting all `/(app)` routes
- `AppHeader.tsx` — title + ProfileAvatar placeholder
- `BottomNav.tsx` — 4 tabs (Wardrobe, Outfits, Saved, Shopping), placeholder pages
- `/lib/constants.ts` — `COLD_START_SWIPE_THRESHOLD`, `SHOPPING_EMPTY_STATE_THRESHOLD`, `SHOPPING_GAP_STALE_HOURS`
- `/lib/seasonUtils.ts` (stub), `/lib/claude.ts` (stub)
- `vitest.config.ts` configured, `test` script in `package.json`
- `.nvmrc` with Node 20

### Acceptance criteria
- `npx convex dev` runs without errors
- `npm run dev` starts without errors
- Visiting `/(app)` route redirects to Clerk sign-in when unauthenticated
- New user can sign up with email + DOB and land on `/(app)/wardrobe`
- User born < 13 years ago sees "You must be 13 or older to use StyleMe" — cannot proceed
- Returning user can log in; logging out redirects to sign-in
- All 4 nav tabs render placeholder pages
- `npm run build` passes with no TypeScript errors
- `npm test` runs without error (no tests yet — confirms Vitest is configured)

> **Age gate scope in M1:** M1 builds the `createUser` mutation with the age validation logic and a basic rejection message. M7 builds the polished 5-step onboarding wizard UI that wraps it with proper styling, copy, and flow. Do not build the full wizard UI in M1.

---

## Milestone 2 — Convex schema

**References:** `docs/TechSpec.md` §3 (full Convex schema with all tables, field types, indexes)

**Goal:** Complete Convex schema defined, types auto-generated, all tables queryable from the dashboard.

### What to build
- `convex/schema.ts` — all 5 tables: `users`, `wardrobeItems`, `outfits`, `outfitSwipes`, `shoppingGaps`
- All indexes as defined in TechSpec §3: `by_clerk_id`, `by_user`, `by_user_active`, `by_user_saved`
- `convex/users.ts` — `createUser` mutation (called by Clerk webhook on sign-up, validates age >= 13), `getProfile` query
- Clerk webhook setup: configure Clerk to call `api.users.createUser` after sign-up
- Seed helper: `convex/seed.ts` with `insertTestUsers` and `insertTestWardrobe` mutations for local dev
- Run seed to create 2 test users in the Convex dashboard

### Acceptance criteria
- `npx convex dev` syncs schema with no errors
- All 5 tables visible in Convex dashboard at https://dashboard.convex.dev
- `convex/_generated/` types are up to date — `Id<"wardrobeItems">` etc. resolve correctly
- `api.users.getProfile` returns the correct user document when called from a signed-in client
- Age validation: `api.users.createUser` throws `too_young` for DOB indicating < 13
- `npm run build` still passes
- `npm test` passes (no tests yet for this milestone — schema has no unit-testable logic)

---

## Milestone 3 — Wardrobe upload + tagging

**References:** `docs/TechSpec.md` §10 (`api.wardrobe.upload` and `api.wardrobe.list` — full contract + edge cases), `docs/PromptTemplates.md` §1 (wardrobe tagging prompt), `docs/UXSpec.md` §3 (wardrobe empty + filled states, item detail sheet), `CLAUDE.md` (image handling rules — max 1200px JPEG 85%, Convex Storage)

**Goal:** Users can upload clothing photos, Claude tags them, wardrobe grid displays items with filtering.

> **Dependency note:** The `upload` action sets `shoppingCacheInvalid: true` on the user document — this flag has no visible effect until M6 (Shopping tab) is built. That's expected — the flag just sits unused until then.

### What to build
- `convex/wardrobe.ts`:
  - `upload` action — validate MIME type + file size, resize to max 1200px JPEG 85% using sharp, `ctx.storage.store()`, call Claude with `WARDROBE_TAGGING_SYSTEM`, insert into `wardrobeItems`, patch user `shoppingCacheInvalid: true`
  - `list` query — return active items with image URLs, reactive
  - `updateItem` mutation — update name and season tags
- `WardrobeGrid.tsx` — `useQuery(api.wardrobe.list)`, 3-column grid, category filter pills
- `ItemUploader.tsx` — file/camera input, preview, progress, error state, sends `ArrayBuffer` to action
- `SeasonTagEditor.tsx` — display and edit `seasonTags`
- Empty state, item detail sheet

### Acceptance criteria
- Upload JPEG or PNG — item appears in grid within 5 seconds (reactive query updates automatically)
- Non-image file rejected with friendly error — not raw error string
- File > 20MB rejected with friendly error
- Stored file is max 1200px JPEG — verify by downloading the stored file URL locally and running `sharp.metadata()` on it, or by inspecting image dimensions in the Convex dashboard Storage tab. Do not call `sharp.metadata()` directly on a Convex Storage URL from within a test.
- Convex Storage URL has no expiry (unlike Supabase signed URLs) — verify URL is permanent
- Claude correctly identifies category (test: t-shirt → tops, jeans → bottoms, sneakers → shoes)
- Category filter pills correctly filter the grid
- User can edit item name and season tags — reactive query auto-updates grid
- **Unit tests pass:** MIME type validation, file size limit, `dominantColourHex` fallback

---

## Milestone 4 — Outfit generation + swipe UI

**References:** `docs/UXSpec.md` §4 (cold start picker — occasion only, Other chip, empty states), §5 (swipe deck, 3D card, batch transition, ContextPill, ContextOverrideSheet), `docs/TechSpec.md` §6 (weather caching), §7 (context_mode — note: graduation logic in M5), §9 (concurrent request handling), §11 (wardrobe truncation), §12 (`api.weather.get`, `api.outfits.generate` — full contract + all edge cases), `docs/PromptTemplates.md` §2 (outfit generation prompt), `CLAUDE.md` (weather, ColdStartPicker rules, batch transition, outfit generation data flow)

**Goal:** Users can generate and swipe outfit batches. ColdStartPicker is occasion-only (no weather UI). Batch transition skeleton works.

> **Dependency note:** M4 generates batches without preference weighting — `preferenceSummary` is empty until M5. Batches use static profile only.

### What to build
- `/lib/seasonUtils.ts` — `getCurrentSeason(hemisphere)` and `filterBySeason(items, season)` with all edge cases
- `convex/weather.ts` — `get` action: check `user.weatherCache`, fetch Open-Meteo if stale (no API key needed), resolves via lat/lng first then city name geocoding fallback, update cache via internal mutation, return `needsLocation: true` when no location set, never throw
- `convex/users.ts` — `saveLocation` mutation: store `locationLat`/`locationLng` and/or `locationCity`, invalidate `weatherCache`
- Outfits page: request browser geolocation on mount → on success call `api.users.saveLocation` → call `api.weather.get` → if `needsLocation: true` show location banner (amber, non-blocking)
- `convex/outfits.ts`:
  - `generate` action — validate occasion, apply season filter (via `seasonUtils`), truncate to 40, call Claude with `OUTFIT_GENERATION_SYSTEM`, validate response, insert outfits, return denormalised batch
  - `listSaved` query
- `ColdStartPicker.tsx` — occasion chips + "Other" chip + free-text (max 80 chars). **No weather tiles. No temperature slider.** Subtitle: "We'll handle the weather automatically"
- `SwipeStack.tsx` — `useAction(api.outfits.generate)`, `isGenerating` guard, 3-card deck, batch transition skeleton after 5th swipe
- `OutfitSwipeCard.tsx` — Option 3D: colour-tinted rows, hero row taller, palette strip, info expand
- Swipe gestures — react-spring + @use-gesture, `isSwiping` guard
- `ContextPill.tsx`, `ContextOverrideSheet.tsx` — occasion only

### Acceptance criteria
- ColdStartPicker has **NO weather tiles, NO temperature slider**
- Subtitle reads "We'll handle the weather automatically"
- "Other" chip reveals free-text, limited to 80 chars, CTA disabled until >= 2 non-whitespace chars
- 0 wardrobe items → friendly error (not raw error)
- Batch of 5 swipe cards loads correctly
- After 5th swipe: 3 skeleton cards appear, buttons hidden, rotating `OUTFIT_LOADING_MESSAGES` shown (cycles every 1.8s)
- New batch loads in place without navigation
- Batch load failure: error card + "Try again"
- Rapid double-tap: only one `api.outfits.generate` call fires (`isGenerating` guard)
- Season filter: December (northern) excludes items tagged only "summer"
- ContextPill tap opens override sheet (occasion-only, no weather section)
- Browser grants geolocation → `locationLat`/`locationLng` saved, ContextPill shows temperature
- Browser denies geolocation → amber location banner appears above ColdStartPicker, outfit generation still works
- `api.weather.get` returns `needsLocation: true` when user has no location set
- Open-Meteo returns weather → ContextPill shows condition and temperature correctly
- **Unit tests pass:** `getCurrentSeason()` all 24 combinations, `filterBySeason()` edge cases, occasion sanitisation

---

## Milestone 5 — Preference learning

**References:** `docs/TechSpec.md` §7 (context_mode graduation inside `api.swipes.record`), §8 (shopping cache invalidation), §12 (`api.swipes.record` — full contract + edge cases), `docs/PromptTemplates.md` §3 (preference recalculation prompt + long-term merge), `docs/UXSpec.md` §8 (Profile sheet — Style DNA, stat cards), `CLAUDE.md` (context_mode graduation, swipe → preference recalc data flow)

**Goal:** Preference summary builds from swipe history and personalises batches. `contextMode` graduates reactively. Swipe cache invalidation works.

### What to build
- `convex/swipes.ts` — `record` mutation: insert swipe, increment `totalSwipes`, check graduation (`>= 20` → `contextMode = 'auto_detect'`), set `shoppingCacheInvalid: true`, schedule preference recalc via `ctx.scheduler.runAfter`
- `convex/preferences.ts` — `recalculate` action (scheduled): fetch last 20 swipes, call Claude with `PREFERENCE_RECALC_SYSTEM`, merge with existing `preferenceSummary`, patch user
- Outfit generation now includes `preferenceSummary` in the Claude prompt
- `useQuery(api.users.getProfile)` is reactive — `contextMode` update is read automatically, no manual state update needed
- Style DNA display in ProfileSheet — `summarySentence` + `likedStyles` pills
- Stat cards in ProfileSheet — total swipes, liked count, items count

### Acceptance criteria
- After a swipe, `user.totalSwipes` increments — confirmed in Convex dashboard
- `api.swipes.record` completes without blocking on preference recalc (async scheduled)
- After 20 swipes: `contextMode = 'auto_detect'` in user doc — ColdStartPicker hidden reactively (no page refresh needed)
- Preference recalc failure: logged, swipe still succeeds, UI unaffected
- Style DNA pills appear in ProfileSheet after preference recalculation completes
- Outfit batches generated after recalc noticeably skew towards consistently liked styles
- **Unit tests pass:** preference summary merge (existing data preserved), array truncation to max 5 items

---

## Milestone 6 — Shopping tab

**References:** `docs/TechSpec.md` §12 (`api.shopping.list`, `api.shopping.regenerate` — staleness logic, all edge cases), `docs/PromptTemplates.md` §4 (shopping gap analysis prompt), `docs/UXSpec.md` §7 (shopping empty state, active gap list, GapCard, GapDetail, WardrobeSnapshot), `CLAUDE.md` (shopping cache invalidation data flow)

**Goal:** Shopping tab shows AI-ranked gap recommendations, compatible item swatches, and working Google Shopping links. Reactive updates when wardrobe changes.

### What to build
- `convex/shopping.ts`:
  - `list` query — reactive, returns gaps with `compatibleItems` denormalised, `isStale` and `regenerating` flags
  - `regenerate` action — fetch wardrobe + preferences, call Claude with `SHOPPING_GAP_SYSTEM`, upsert gaps, set `shoppingCacheInvalid: false`
- `ShoppingEmptyState.tsx` — when `totalSwipes < 10`
- `WardrobeSnapshot.tsx` — gaps found / occasions / item count
- `GapCard.tsx` — name, priority badge, reason, occasion tags, CTA. High priority: `border-2 border-violet-600`
- `GapDetail.tsx` — reasoning panel, compatible item swatches from `dominantColourHex`, search query, Google Shopping CTA
- Filter pills — All / High priority / By occasion
- "Updated X ago" timestamp from `_creationTime` of most recent gap

### Acceptance criteria
- Empty state when `totalSwipes < 10`
- Gap cards when `totalSwipes >= 10`
- `api.shopping.list` returns stale gaps immediately with `isStale: true` while regenerating — no loading block
- Adding a wardrobe item: shopping tab reactively shows `isStale: true` (no page refresh needed)
- 0 wardrobe items: `api.shopping.regenerate` returns `{ gapsGenerated: 0 }` — not an error
- Top-priority gap card has `border-2 border-violet-600`
- GapDetail colour swatches match actual `dominantColourHex` values
- "Open Google Shopping" opens correct pre-filled URL in new tab
- Off-season gaps sorted below current-season gaps

---

## Milestone 7 — Onboarding + profile

**References:** `docs/UXSpec.md` §2 (5-step wizard — including location row in step 2a, silhouette + fit selectors, edit profile screen), §10 (copy table — all onboarding and location strings), `docs/TechSpec.md` §5 (profile photo analyse-once pattern), §12 (`api.users.uploadPhoto`, `api.users.updateProfile`, `api.users.saveLocation` — full contract + validation errors), `docs/PromptTemplates.md` §5 (photo summary prompt), `CLAUDE.md` (profile fields, onboarding completion data flow)

**Goal:** Full 5-step onboarding, age gate (13+), silhouette/fit selectors, location collection, profile photo with Claude summary, edit profile screen.

### What to build
- 5-step onboarding wizard UI: (1) Clerk sign-up + DOB, (2a) photo + basic details + **location row**, (2b) body silhouette + fit preference, (3) style chips, (4) first wardrobe item — **the `createUser` mutation with age validation logic was built in M1; M7 builds the wizard UI that surfaces the rejection gracefully**
- **Location row in step 2a** (see UXSpec §2 step 2a):
  - "Use my location" button → calls `navigator.geolocation.getCurrentPosition` → saves via `api.users.saveLocation`
  - On denial: "Enter city instead" link reveals city text input → saves via `api.users.saveLocation({ locationCity })`
  - Optional — "Next" not disabled if skipped
- **`LocationSheet.tsx`** — reusable bottom sheet with same geolocation + city input pattern, used from Outfits tab banner (M8) and Edit profile
- Hemisphere auto-detection from browser geolocation, manual override in edit profile
- `api.users.uploadPhoto` — resize max 600px JPEG, `ctx.storage.store()`, Claude summary, handle summary failure gracefully
- `BodySilhouetteSelector.tsx` — 6-tile grid (TBD illustrations — placeholder tiles for now)
- `FitPreferenceSelector.tsx` — 4-tile grid (TBD illustrations — placeholder tiles)
- `api.users.updateProfile` — validates `bodySilhouette`, `fitPreferences` (max 2)
- Edit profile screen — full-screen page, all fields editable including location, pre-populated from `useQuery(api.users.getProfile)`

### Acceptance criteria
- New user sees 5-step wizard on first login
- User born < 13 years ago: the `too_young` error from `createUser` (M1) is surfaced as a styled rejection screen — clear message, cannot proceed to step 2
- Step 2a: "Use my location" button triggers browser geolocation prompt
- Step 2a: If geolocation granted → location saved, button shows "✓ Location saved"
- Step 2a: If geolocation denied → city input slides down, user can type city name
- Step 2a: Location is optional — "Next" is enabled regardless
- Body silhouette and fit preference tiles are selectable in step 2b
- Profile photo upload: `profilePhotoSummary` populated in user doc after upload
- Claude summary failure: photo URL still stored, `profilePhotoSummary = 'Appearance not available'` — success
- `api.users.updateProfile` with invalid `bodySilhouette`: throws `invalid_silhouette`
- `api.users.updateProfile` with 3 `fitPreferences`: throws `too_many_fit_preferences`
- `api.users.saveLocation` with no location data: throws `missing_location`
- Outfit generation uses `profilePhotoSummary` text — confirmed by inspecting action args
- Edit profile: all fields including location pre-populated from reactive profile query
- "Profile updated" toast on successful save

---

## Milestone 8 — Polish states

**References:** `docs/UXSpec.md` §9 (interaction states master table), §10 (all error, toast, offline strings), `CLAUDE.md` (error handling philosophy, Convex `connectionState` offline pattern)

**Goal:** All empty, loading, and error states across every screen. Offline handling via Convex `connectionState`. Toasts.

### What to build
- Loading skeletons on all `useQuery` screens (`bg-slate-100 animate-pulse`)
- Error states for `useAction`/`useMutation` failures — friendly card + "Try again", never raw errors
- Offline banner using Convex `connectionState` — amber banner when `'Connecting'`
- Note: Convex mutations queue offline automatically — no manual queue needed
- "Syncing..." toast on reconnect — show briefly when `connectionState` returns to `'Connected'`
- Claude action slow indicator (> 5s) — "Taking a little longer..." after 3s (does not apply to outfit generation or shopping regeneration — those have their own dedicated progress UI)
- Toast system — "Item uploaded", "Outfit saved", "Profile updated", "Syncing..." — auto-dismiss 3s
- Outfits empty states: State A (wardrobe exists) and State B (no wardrobe items)
- **Location banner** — amber banner above ColdStartPicker when `needsLocation: true` from `api.weather.get`. Uses `LocationSheet.tsx` built in M7. Dismissible per session.

### Acceptance criteria
- No blank screens during `useQuery` loading — skeletons always shown
- No raw error strings visible to user in any failure
- Going offline: amber "You're offline" banner via Convex `connectionState`
- Swiping while offline: `useMutation(api.swipes.record)` queues automatically — appears in DB on reconnect
- "Syncing..." toast appears briefly on reconnect
- Claude action > 5s: "Taking a little longer..." appears after 3s (for general actions — not outfit gen or shopping regen)
- All 4 toast types appear and auto-dismiss after 3 seconds
- Outfits State A: ColdStartPicker shown with "Ready to style your wardrobe"
- Outfits State B: "Go to Wardrobe" CTA navigates correctly
- User with no location set: amber "Add your location" banner shown above ColdStartPicker
- Tapping "Set location" in banner opens `LocationSheet`
- Setting location via `LocationSheet`: banner dismisses, weather fetches immediately, ContextPill updates
- Dismissing banner (×): banner hidden for the session, reappears on next app open
- Saved page: tapping a saved outfit row expands it inline with item photos and worn dates; tapping again collapses it; only one card open at a time
- Saved page: "Remove" button in expanded panel unsaves the outfit; it disappears from the list reactively

---

## Milestone 9 — Production readiness

**References:** `docs/TechSpec.md` §12 (`GET /api/health`), `CLAUDE.md` (error logging pattern), `docs/EnvironmentBootstrap.md` §10 (Vercel + Convex production deploy)

**Goal:** App deployed to Vercel + Convex Cloud, auth audited, performance acceptable, ready for first user testing.

### What to build
- `npx convex deploy --prod` — deploys schema and functions to Convex Cloud production
- Vercel project — link GitHub repo, configure all env vars (including production `NEXT_PUBLIC_CONVEX_URL`)
- Convex production env vars set: `ANTHROPIC_API_KEY`, `CLERK_ISSUER_URL` (no weather key needed — Open-Meteo requires none)
- Access control audit — verify every Convex function calls `getCurrentUser()` and throws if unauthenticated
- Startup env validation in `app/layout.tsx` — check required env vars on boot
- `GET /api/health` Next.js route — returns `{ db: 'ok', version: string }`
- Mobile viewport testing — iPhone Safari and Android Chrome at 390px and 430px
- Accessibility basics — aria labels on all interactive elements, WCAG AA contrast

### Acceptance criteria
- App accessible at a public Vercel URL
- Full happy path on production: sign up → upload item → swipe → view shopping tab
- Access control audit: calling any Convex function without a Clerk session throws `unauthenticated`
- Cross-user isolation: User A cannot read User B's `wardrobeItems` — verified by calling `api.wardrobe.list` with User B's token
- Starting app with missing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` logs clear error
- `GET /api/health` returns 200 `{ db: 'ok' }`
- `npm test` passes with > 80% coverage on `seasonUtils.ts`
- Outfit generation completes in < 8 seconds on production
- No console errors in the happy path
- Swipe gestures work on iPhone Safari — no scroll conflict

---

## Milestone 10 — Aura Elan design system

**References:** `docs/UXSpec.md` §1 (full Aura Elan token set, AppHeader, BottomNav), §3 (wardrobe asymmetric grid), §5 (Aura Elan outfit card layout), §6 (saved accordion), §7 (shopping editorial cards), `CLAUDE.md` (Tailwind conventions, BottomNav safe-area gotcha)

**Goal:** Apply the Aura Elan design system across all screens. No new features — visual and layout changes only.

### What to build
- `tailwind.config.js` — add full Aura Elan Material Design 3 colour token set (see UXSpec §1 for all values: `primary`, `primary-container`, `on-primary`, `background`, `surface-*`, `on-surface`, `on-surface-variant`, `secondary`, `outline`, `outline-variant`, `error`, etc.)
- Load `Noto Serif` and `Manrope` via Google Fonts in `app/layout.tsx` — add `font-headline`/`font-body`/`font-label` Tailwind font families
- **AppHeader.tsx** — height 72px, glass `bg-white/80 backdrop-blur-xl`, hamburger left, "StyleMe" serif italic centre, account circle right
- **BottomNav.tsx** — replace full-width bar with floating pill (`fixed bottom-6 rounded-full w-[90%] max-w-md`). Tab labels updated: "Wardrobe" → **"Closet"**. Icon: `dresser` for Closet. Active state: `bg-violet-50 text-violet-700 rounded-full py-2 px-5`
- Update all `pb-` / `fixed bottom-*` page padding to clear the new pill height (use `pb-28`)
- **WardrobeGrid.tsx** — 2-col asymmetric grid (`grid-cols-2 gap-x-6 gap-y-10`), `pt-8`/`pt-12` offsets on even column items, `rounded-lg` tiles, heart-overlay button, brand label + serif item name below image
- **OutfitSwipeCard.tsx** — Aura Elan layout: hero image top 2/3, item thumbnail scroll row bottom third, info button expands reasoning inline (no caption bar)
- **SwipeStack.tsx** — update back-card blur/scale classes to match new spec
- **Saved page** — replace list rows with accordion (`rounded-xl`), 2-col item grid in expanded panel, occasion badge colours updated
- **Shopping gap cards** — editorial vertical list, `aspect-[4/5]` hero image, priority badges only (`High Priority` / `Core Essential` / `Seasonal Update`), no Level labels, `rounded-full` CTAs
- Update all primary buttons to `rounded-full` throughout the app
- Update all skeleton placeholders to `bg-surface-container-high`

### Acceptance criteria
- `tailwind.config.js` has all Aura Elan tokens — `bg-primary` resolves to `#645783`
- Noto Serif loads correctly — outfit card title renders in serif
- AppHeader: "StyleMe" in italic serif, account icon right — no hamburger, no screen title in header
- BottomNav: floating pill visible, "Closet" tab label, `dresser` icon, clears page content
- Wardrobe grid: 2-col asymmetric stagger visible — even-column items visually offset lower
- Wardrobe FAB: `bottom-24 right-6`, clears BottomNav pill
- Outfit card: hero image fills top 2/3, thumbnail row scrolls horizontally, info button expands reasoning
- Saved: accordion opens/closes, only one item open at a time, expanded shows 2-col item grid + "Mark as worn today" CTA
- Shopping: gap cards are vertical editorial list, `4/5` aspect hero image, correct priority badge colours, no Level labels
- All primary CTAs: `rounded-full` (not `rounded-xl`)
- No `fixed bottom-0` UI elements — nothing hidden behind BottomNav pill
- `npm run build` passes with no TypeScript errors
- `npm test` passes

**Status: ✅ Complete** — All ACs verified. Additional auth fixes shipped alongside M10 (see PROGRESS.md).

---

## Milestone 11 — Privacy & data

**References:** `docs/UXSpec.md` §11 (Privacy & Data screen spec), `CLAUDE.md` (profile fields — full list of what's stored), `docs/TechSpec.md` §3 (Convex schema — all tables to delete)

**Goal:** Users can view what data StyleMe holds, download it, and permanently delete their account and all associated data.

### What to build
- `convex/users.ts` — `deleteAccount` action: deletes in order:
  1. All wardrobe item files from Convex Storage (`storageId` on each `wardrobeItems` doc)
  2. Profile photo from Convex Storage (`profilePhotoStorageId` on user doc)
  3. All `outfitSwipes` documents for this user
  4. All `outfits` documents for this user
  5. All `wardrobeItems` documents for this user
  6. All `shoppingGaps` documents for this user
  7. The `users` document
  8. The Clerk user account via Clerk Backend API
- `convex/users.ts` — `exportData` query: returns a single JSON object containing all user data (profile, wardrobe items, outfits, swipes, shopping gaps) for download
- `/app/(app)/privacy/page.tsx` — Privacy & Data screen (see UXSpec §11)
- `/app/privacy-policy/page.tsx` — public static page, no auth required
- `/app/terms/page.tsx` — public static page, no auth required
- Onboarding step 1: add two required consent checkboxes (Terms + Privacy Policy) — cannot proceed without both checked
- Onboarding profile photo upload: add one-line disclosure below upload button
- Onboarding wardrobe upload: add one-line disclosure below upload zone

### Acceptance criteria
- `api.users.deleteAccount`: after calling, zero documents remain in any table for that user — verified in Convex dashboard
- `api.users.deleteAccount`: Convex Storage files are deleted — verified by attempting to fetch the old URLs
- `api.users.deleteAccount`: Clerk user account is deleted — verified by attempting to sign in with the same credentials
- "Download my data" button produces a valid JSON file containing all user data
- Deleting account while offline: action fails gracefully with "Try again when connected" — no partial deletion
- `/privacy-policy` and `/terms` pages load without authentication
- Onboarding: "Continue" on step 1 is disabled until both consent checkboxes are checked
- Profile photo disclosure copy appears below upload button in onboarding step 2a
- Wardrobe item disclosure copy appears below upload zone in onboarding step 4
- Privacy & Data screen accessible from ProfileSheet → "Privacy and data" menu row
