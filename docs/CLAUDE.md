# CLAUDE.md — StyleMe Web App (v2.0)

## Document version matrix

| Document               | Version | Last updated |
|------------------------|---------|--------------|
| PRD                    | v1.6    | March 2026   |
| Tech Spec              | v2.0    | March 2026   |
| UX Spec                | v1.4    | March 2026   |
| Prompt Templates       | v1.1    | March 2026   |
| Build Order            | v2.0    | March 2026   |
| Environment Bootstrap  | v2.1    | March 2026   |
| CLAUDE.md              | v2.1    | March 2026   |

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
Bottom nav: Wardrobe | Outfits | Saved | Shopping
```

Profile is a slide-over panel opened by the avatar icon in AppHeader — **NOT a nav tab**.

---

## Key data flows

### 1. Outfit generation lifecycle

1. Outfits page mounts → `useQuery(api.users.getProfile)` → read `contextMode`
2. `useAction(api.weather.get)` → returns `{ condition, tempC }` (from `user.weatherCache` or fresh fetch)
3. If `contextMode = 'cold_start'` → render `ColdStartPicker`
4. User selects occasion → taps "Generate outfits" → set `isGenerating = true`
5. `useAction(api.outfits.generate)` with `{ occasion, weatherCondition, weatherTempC }`
6. Convex action: apply season filter → truncate to 40 items → build Claude prompt → call Claude
7. Claude returns 5 outfits → validate → insert into `outfits` table → return denormalised batch
8. `isGenerating = false` → render `SwipeStack`

### 2. Swipe → preference recalc → next batch

1. User swipes → `isSwiping = true`
2. `useMutation(api.swipes.record)` with `{ outfitId, liked }`
3. Mutation: insert `outfitSwipes` → increment `totalSwipes` → check graduation → patch user doc atomically
4. If `newTotal >= 20` → `contextMode = 'auto_detect'` written to user doc
5. `useQuery(api.users.getProfile)` is reactive — components reading `contextMode` auto-update
6. `isSwiping = false`
7. If `newTotal % 5 === 0` → `ctx.scheduler.runAfter(0, api.preferences.recalculate)` fires async
8. After 5th swipe in batch → show skeleton cards → call `api.outfits.generate` again

### 3. Shopping cache invalidation

1. Wardrobe upload or swipe recorded → mutation patches `user.shoppingCacheInvalid = true`
2. User opens Shopping tab → `useQuery(api.shopping.list)` is reactive
3. Query checks `shoppingCacheInvalid` → returns `{ isStale: true }` immediately with current gaps
4. Frontend calls `useAction(api.shopping.regenerate)` async
5. Action: fetch wardrobe + preferences → call Claude → upsert `shoppingGaps` → patch `shoppingCacheInvalid = false`
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
| Convex action slow (>5s) | Progress indicator + "Taking a little longer..." after 3s |
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

| Element | Classes |
|---|---|
| Primary button | `bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98]` |
| Ghost button | `border border-slate-200 bg-white text-slate-700 rounded-xl px-6 py-3 text-sm` |
| Selected tile | `border-2 border-violet-600 bg-violet-50` |
| Unselected tile | `border border-slate-200 bg-white` |
| Offline banner | `bg-amber-50 border-b border-amber-200 text-amber-800` |
| Skeleton | `bg-slate-100 animate-pulse rounded-2xl` |

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
- Build Order has **9 milestones**: M2 is now Convex schema (no SQL), M9 includes Convex Cloud deploy
