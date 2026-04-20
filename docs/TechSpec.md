# Technical Specification
**Project:** StyleMe | **Stack:** Next.js 14 + Convex + Clerk + Claude API  
**Version:** 2.0 | **Date:** March 2026

---

## 1. Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 14 (App Router) | React-based, Vercel deploy |
| Styling | Tailwind CSS | Mobile-first |
| Swipe gestures | react-spring + @use-gesture/react | Physics-based |
| Auth | Clerk | Email + Google OAuth, JWT passed to Convex |
| Database + backend | Convex | Reactive queries, mutations, actions |
| File storage | Convex Storage | Built-in — no separate service needed |
| AI — all calls | Claude API (claude-sonnet-4-6) | Called from Convex actions |
| Weather | Open-Meteo API | Free, no API key required, called from Convex action, cached on user doc |
| Shopping links | Google Shopping URL | No API — constructed from `searchQuery` |
| Deployment | Vercel (frontend) + Convex Cloud (backend) | Both free tiers |

**Why no Next.js API routes:** Convex actions run server-side and can call Claude and Open-Meteo directly. This eliminates the `/api/` layer entirely except for `GET /api/health`.

---

## 2. Convex Architecture

| Function type | Use for | Client hook |
|--------------|---------|-------------|
| `query` | Read data — reactive, cached, real-time | `useQuery` |
| `mutation` | Write data | `useMutation` |
| `action` | External API calls (Claude, Open-Meteo) + orchestration | `useAction` |

**Folder structure:**
```
/convex/
  schema.ts         ← single source of truth for all types
  users.ts          ← profile queries + mutations + photo action
  wardrobe.ts       ← list query + upload action + update mutation
  outfits.ts        ← generate action + saved list query + save mutation
  swipes.ts         ← record mutation (includes graduation + cache invalidation)
  shopping.ts       ← list query + regenerate action
  weather.ts        ← get action (fetch + cache)
  preferences.ts    ← recalculate action (scheduled)
  _generated/       ← auto-generated types — never edit
```

**Client usage pattern:**
```typescript
const items = useQuery(api.wardrobe.list);              // reactive
const record = useMutation(api.swipes.record);          // write
const generate = useAction(api.outfits.generate);       // external API
```

---

## 3. Convex Schema

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  users: defineTable({
    clerkId:               v.string(),
    displayName:           v.string(),
    dateOfBirth:           v.string(),
    heightCm:              v.optional(v.number()),
    hairColour:            v.optional(v.string()),
    hairStyle:             v.optional(v.string()),
    profilePhotoUrl:       v.optional(v.string()),
    profilePhotoStorageId: v.optional(v.id("_storage")),
    profilePhotoSummary:   v.optional(v.string()),
    stylePreferences:      v.array(v.string()),
    bodySilhouette:        v.optional(v.union(
      v.literal("hourglass"), v.literal("rectangle"), v.literal("pear"),
      v.literal("inverted_triangle"), v.literal("apple"), v.literal("petite")
    )),
    fitPreferences:        v.array(v.string()),
    hemisphere:            v.union(v.literal("northern"), v.literal("southern")),
    locationLat:           v.optional(v.number()),
    locationLng:           v.optional(v.number()),
    locationCity:          v.optional(v.string()),  // fallback when geolocation denied — e.g. "London"
    weatherCache:          v.optional(v.object({
      condition:           v.union(v.string(), v.null()),
      tempC:               v.union(v.number(), v.null()),
      cachedAt:            v.number(),
    })),
    preferenceSummary:     v.optional(v.object({
      likedColours:        v.array(v.string()),
      avoidedColours:      v.array(v.string()),
      likedStyles:         v.array(v.string()),
      avoidedStyles:       v.array(v.string()),
      preferredSilhouettes: v.array(v.string()),
      preferredOccasions:  v.array(v.string()),
      summarySentence:     v.string(),
    })),
    totalSwipes:           v.number(),
    contextMode:           v.union(v.literal("cold_start"), v.literal("auto_detect")),
    shoppingCacheInvalid:  v.boolean(),
  }).index("by_clerk_id", ["clerkId"]),

  wardrobeItems: defineTable({
    userId:            v.id("users"),
    storageId:         v.id("_storage"),
    imageUrl:          v.string(),
    name:              v.string(),
    category:          v.union(
      v.literal("tops"), v.literal("bottoms"), v.literal("shoes"),
      v.literal("outerwear"), v.literal("accessories"),
      v.literal("dresses"), v.literal("bags")
    ),
    colours:           v.array(v.string()),
    tags:              v.array(v.string()),
    seasonTags:        v.array(v.string()),
    dominantColourHex: v.string(),
    isActive:          v.boolean(),
    aiTaggedAt:        v.optional(v.number()),
  })
  .index("by_user", ["userId"])
  .index("by_user_active", ["userId", "isActive"]),

  outfits: defineTable({
    userId:           v.id("users"),
    itemIds:          v.array(v.id("wardrobeItems")),
    heroItemId:       v.id("wardrobeItems"),
    occasion:         v.string(),
    weatherCondition: v.optional(v.string()),
    weatherTempC:     v.optional(v.number()),
    season:           v.string(),
    reasoning:        v.string(),
    gapSuggestion:    v.optional(v.object({
      itemName:       v.string(),
      reason:         v.string(),
      priority:       v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
      searchQuery:    v.string(),
    })),
    styleTags:        v.array(v.string()),
    colourPalette:    v.array(v.string()),
    isSaved:          v.boolean(),
    wornOn:           v.array(v.string()),
    batchId:          v.string(),
  })
  .index("by_user", ["userId"])
  .index("by_user_saved", ["userId", "isSaved"]),

  outfitSwipes: defineTable({
    userId:           v.id("users"),
    outfitId:         v.id("outfits"),
    liked:            v.boolean(),
    occasion:         v.string(),
    weatherCondition: v.optional(v.string()),
    weatherTempC:     v.optional(v.number()),
    // Note: Convex auto-generates _creationTime on every document.
    // Use .order("desc") on _creationTime to get the most recent 20 swipes
    // for preference recalculation — no explicit createdAt field needed.
  }).index("by_user", ["userId"]),

  shoppingGaps: defineTable({
    userId:            v.id("users"),
    itemName:          v.string(),
    reason:            v.string(),
    priority:          v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    affectedOccasions: v.array(v.string()),
    compatibleItemIds: v.array(v.id("wardrobeItems")),
    searchQuery:       v.string(),
    seasonRelevance:   v.union(v.literal("current"), v.literal("upcoming"), v.literal("off-season")),
  }).index("by_user", ["userId"]),

});
```

> **No migrations.** Edit `schema.ts` → run `npx convex dev` → Convex validates and syncs automatically. Types are generated in `convex/_generated/` — never edit those files.

---

## 4. Auth — Clerk + Convex Integration

```typescript
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

```typescript
// convex/users.ts — TWO auth helpers: one for queries/mutations, one for actions
// ctx.db is only available in queries and mutations, not in actions.
// Actions must use ctx.runQuery to read data.

// Use this in queries and mutations (ctx.db is available):
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "unauthenticated" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new ConvexError({ code: "user_not_found" });
  return user;
}

// Use this in actions (ctx.db is NOT available — must use ctx.runQuery):
export async function getCurrentUserFromAction(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "unauthenticated" });
  const user = await ctx.runQuery(api.users.getByClerkId, { clerkId: identity.subject });
  if (!user) throw new ConvexError({ code: "user_not_found" });
  return user;
}

// Internal query called by getCurrentUserFromAction:
export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return ctx.db.query("users").withIndex("by_clerk_id", q => q.eq("clerkId", clerkId)).unique();
  }
});
```

> **Rule:** Use `getCurrentUser(ctx)` in queries and mutations. Use `getCurrentUserFromAction(ctx)` in actions. Never call `ctx.db` directly inside an action handler.

```typescript
// app/middleware.ts — Clerk protects all /(app) routes
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
const isProtected = createRouteMatcher(["/(app)(.*)"]);
export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) auth().protect();
});
```

**Age gate:** Collect `dateOfBirth` on Clerk sign-up via custom fields. A `createUser` mutation (called from a Clerk webhook after sign-up) validates the age — if under 13, throws `ConvexError({ code: "too_young" })` and the user record is not created.

---

## 5. Profile Photo — Analyse Once Pattern

```typescript
// convex/users.ts
export const uploadPhoto = action({
  args: { fileBuffer: v.bytes() },
  handler: async (ctx, { fileBuffer }) => {
    // Actions cannot call ctx.db — use getCurrentUserFromAction which uses ctx.runQuery
    const user = await getCurrentUserFromAction(ctx);

    // Resize server-side
    const resized = await resizeImage(fileBuffer, 600);

    // Store in Convex Storage — ctx.storage IS available in actions
    const storageId = await ctx.storage.store(new Blob([resized], { type: "image/jpeg" }));
    const url = await ctx.storage.getUrl(storageId);

    // Generate summary with Claude — failure is non-blocking
    let summary = "Appearance not available";
    try { summary = await callClaudePhotoSummary(url!); } catch {}

    // Write to DB via an internal mutation — actions cannot call ctx.db directly
    await ctx.runMutation(internal.users.savePhoto, {
      userId: user._id,
      storageId,
      profilePhotoUrl: url!,
      profilePhotoSummary: summary,
    });

    return { profilePhotoUrl: url!, profilePhotoSummary: summary };
  }
});

// Internal mutation called by uploadPhoto action:
export const savePhoto = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    profilePhotoUrl: v.string(),
    profilePhotoSummary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      profilePhotoStorageId: args.storageId,
      profilePhotoUrl: args.profilePhotoUrl,
      profilePhotoSummary: args.profilePhotoSummary,
    });
  }
});
```

---

## 6. Weather Caching — User Document

Weather is a field on the user document. Because `api.users.getProfile` is a reactive query, any component reading the profile automatically sees fresh weather when it is updated.

**Open-Meteo — no API key required:**
```typescript
// Helper called inside the action — no key needed
// Resolves coordinates from lat/lng OR city name via Open-Meteo geocoding
async function fetchOpenMeteo(
  lat: number | undefined,
  lng: number | undefined,
  city: string | undefined
) {
  let resolvedLat = lat, resolvedLng = lng;

  // If no coordinates, try geocoding the city name
  if ((!resolvedLat || !resolvedLng) && city) {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );
    const geoData = await geo.json();
    resolvedLat = geoData.results?.[0]?.latitude;
    resolvedLng = geoData.results?.[0]?.longitude;
  }

  if (!resolvedLat || !resolvedLng) return { condition: null, tempC: null };

  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${resolvedLat}&longitude=${resolvedLng}&current=temperature_2m,weather_code`;
  const res = await fetch(url);
  const data = await res.json();
  const code = data.current?.weather_code ?? 0;
  // Map WMO weather codes to StyleMe condition strings
  const condition =
    code === 0                        ? 'sunny'  :
    code <= 3                         ? 'cloudy' :
    (code >= 51 && code <= 67)        ? 'rainy'  :
    (code >= 71 && code <= 77)        ? 'cold'   :
    (code >= 80 && code <= 82)        ? 'rainy'  :
    (code >= 95)                      ? 'rainy'  : 'cloudy';
  return { condition, tempC: data.current?.temperature_2m ?? null };
}
```

```typescript
// convex/weather.ts
export const get = action({
  args: {},
  handler: async (ctx): Promise<{ condition: string | null; tempC: number | null }> => {
    // Actions cannot call ctx.db — use getCurrentUserFromAction
    const user = await getCurrentUserFromAction(ctx);

    const cache = user.weatherCache;
    if (cache && Date.now() - cache.cachedAt < 30 * 60 * 1000) {
      return { condition: cache.condition, tempC: cache.tempC };
    }

    let condition = null, tempC = null;
    try {
      ({ condition, tempC } = await fetchOpenMeteo(
        user.locationLat,
        user.locationLng,
        user.locationCity
      ));
    } catch {}

    // Write updated cache via internal mutation — actions cannot call ctx.db
    await ctx.runMutation(internal.weather.saveCache, {
      userId: user._id,
      condition,
      tempC,
      cachedAt: Date.now(),
    });

    return { condition, tempC };
  }
});

// Internal mutation called by get action:
export const saveCache = internalMutation({
  args: {
    userId: v.id("users"),
    condition: v.union(v.string(), v.null()),
    tempC: v.union(v.number(), v.null()),
    cachedAt: v.number(),
  },
  handler: async (ctx, { userId, condition, tempC, cachedAt }) => {
    await ctx.db.patch(userId, { weatherCache: { condition, tempC, cachedAt } });
  }
});
```

---

## 7. context_mode Graduation

No DB trigger. Logic lives inside `api.swipes.record`:

```typescript
const newTotal = user.totalSwipes + 1;
const newContextMode = newTotal >= COLD_START_SWIPE_THRESHOLD ? "auto_detect" : user.contextMode;

await ctx.db.patch(user._id, {
  totalSwipes: newTotal,
  contextMode: newContextMode,
  shoppingCacheInvalid: true,
});

// Schedule async preference recalc
if (newTotal % 5 === 0) {
  await ctx.scheduler.runAfter(0, api.preferences.recalculate, {});
}
```

**Frontend:** reads `contextMode` from the reactive `useQuery(api.users.getProfile)`. No need to read it from a swipe response — the query auto-updates.

---

## 8. Shopping Cache Invalidation

Set `shoppingCacheInvalid: true` in any mutation that should trigger regeneration:
- `api.swipes.record` — always (shown above)
- `api.wardrobe.upload` — after inserting new item
- `api.wardrobe.updateItem` — after editing item tags

`api.shopping.list` checks `shoppingCacheInvalid` and returns `isStale: true` when set. The frontend immediately clears all gap cards — stale gaps are never shown at reduced opacity. The frontend triggers `api.shopping.regenerate` async and shows the `SHOPPING_LOADING_STEPS` thinking steps UI instead.

---

## 9. Offline Handling

Convex handles offline natively:
- Mutations queue automatically when the client is offline and replay on reconnect
- Queries return the last cached result when offline
- Use `connectionState` from the Convex client to show the "You're offline" banner

```typescript
import { useConvex } from "convex/react";
const convex = useConvex();
// convex.connectionState() === "Connecting" | "Connected" | "Disconnected"
```

---

## 10. Full Convex Function Contract

**Standard error:** `throw new ConvexError({ code: "snake_case_code" })`

---

### api.wardrobe.list — query

**Returns:** `{ items: WardrobeItem[], total: number }`  
`imageUrl` is a permanent Convex Storage URL (no expiry).  
Returns `{ items: [], total: 0 }` if empty — never an error.  
**Reactive** — auto-updates on any wardrobe change.

---

### api.wardrobe.upload — action

**Args:** `{ fileBuffer: ArrayBuffer, mimeType: string }`

**Returns:** Inserted `WardrobeItem` document

**Errors:**

| code | Condition |
|------|-----------|
| `invalid_file_type` | Not image/jpeg, image/png, or image/webp |
| `file_too_large` | Exceeds 20MB |
| `wardrobe_full` | User has 200 active items |
| `tagging_failed` | Claude invalid JSON after 2 attempts |

**Edge cases:** Invalid category → `'accessories'`. No `dominantColourHex` → derive from `colours[0]`. After insert: `shoppingCacheInvalid: true`.

---

### api.users.getProfile — query

**Returns:** Full user document (excluding `clerkId`)  
**Reactive** — frontend reads `contextMode` from here, not from swipe response.

---

### api.users.updateProfile — mutation

**Args (all optional):** `displayName`, `heightCm`, `hairColour`, `hairStyle`, `stylePreferences`, `bodySilhouette`, `fitPreferences`, `hemisphere`

**Errors:** `invalid_silhouette`, `too_many_fit_preferences`, `invalid_fit_preference`

---

### api.users.saveLocation — mutation

Called after geolocation resolves OR after user submits a city name.

**Args:**
```typescript
{
  locationLat?: number,    // from browser geolocation
  locationLng?: number,    // from browser geolocation
  locationCity?: string,   // from manual city input — max 100 chars
}
```

**Returns:** `{ updated: true }`

**Notes:**
- At least one of `locationLat`/`locationLng` pair OR `locationCity` must be provided
- If both are provided (geolocation succeeded AND city typed): store both — lat/lng takes priority in `fetchOpenMeteo`
- Saving a new location immediately invalidates `weatherCache` so next `api.weather.get` call fetches fresh data
- `locationCity` is stored as entered — no normalisation — geocoding happens at fetch time in `fetchOpenMeteo`

**Errors:** `missing_location` — neither coordinates nor city provided

---

### api.users.uploadPhoto — action

**Args:** `{ fileBuffer: ArrayBuffer }`  
**Returns:** `{ profilePhotoUrl: string, profilePhotoSummary: string }`  
Claude failure → store photo, set summary to `'Appearance not available'`, return success.

---

### api.weather.get — action

**Returns:** `{ condition: string | null, tempC: number | null, needsLocation: boolean }`

**Never throws.** Returns `{ condition: null, tempC: null, needsLocation: true }` when both `locationLat`/`locationLng` and `locationCity` are null — frontend uses `needsLocation: true` to show the location prompt banner.  
Caches result in `user.weatherCache` for 30 minutes.

---

### api.outfits.generate — action

**Args:** `{ occasion: string, weatherCondition: string | null, weatherTempC: number | null }`

**Returns:**
```typescript
{
  outfits: Array<{
    _id: Id<"outfits">,
    outfitIndex: number,
    itemIds: Id<"wardrobeItems">[],
    heroItemId: Id<"wardrobeItems">,
    items: Array<{ _id, name, category, dominantColourHex, imageUrl }>,
    occasion: string,
    weatherCondition: string | null,
    weatherTempC: number | null,
    season: string,
    reasoning: string,
    colourPalette: string[],
    styleTags: string[],
    gapSuggestion: { itemName, reason, priority, searchQuery } | null,
  }>,
  batchId: string,
  isPartial?: boolean
}
```

**Errors:** `missing_occasion`, `occasion_too_long`, `no_wardrobe_items`, `generation_failed`

**Edge cases:** Claude returns 4 → insert all 4, log warning. Claude returns 6+ → truncate to 5. Unknown `itemId` → strip; if < 3 valid outfits → return with `isPartial: true`. Weather null → `"Weather: not available"`.

---

### api.swipes.record — mutation

**Args:** `{ outfitId: Id<"outfits">, liked: boolean }`

**Returns:** `{ swipeId, newTotalSwipes, contextMode, preferenceRecalcTriggered }`

**Errors:** `outfit_not_found`

**Edge cases:** Double-swipe → both inserts succeed. Preference recalc scheduled async via `ctx.scheduler`. Updates `totalSwipes`, `contextMode`, `shoppingCacheInvalid` atomically.

**Ordering for recalculation:** `outfitSwipes` has no explicit `createdAt` field. Use Convex's auto-generated `_creationTime` to fetch the most recent 20 swipes:
```typescript
const recentSwipes = await ctx.db
  .query("outfitSwipes")
  .withIndex("by_user", q => q.eq("userId", user._id))
  .order("desc")   // newest first via _creationTime
  .take(20);
```

---

### api.outfits.save — mutation

**Args:** `{ outfitId: Id<"outfits"> }`  
Already saved → idempotent success.

---

### api.shopping.list — query

**Returns:** `{ gaps: ShoppingGap[], isStale: boolean, regenerating: boolean }`
Returns `{ gaps: [], isStale: false, regenerating: false }` if `totalSwipes < 10`.
**Reactive** — auto-updates when gaps change.

**Frontend behaviour when `regenerating: true`:** discard the `gaps` array, do not render stale cards, show `SHOPPING_LOADING_STEPS` instead. The `gaps` array is intentionally ignored until `regenerating` returns to `false` and the response contains fresh data.

---

### api.shopping.regenerate — action

**Returns:** `{ gapsGenerated: number }`

**Errors:** `generation_failed`, `already_regenerating`

**Edge cases:** 0 items or < 10 swipes → `{ gapsGenerated: 0 }`. Claude > 6 gaps → truncate to 6. Unknown `compatibleItemIds` → strip. After upsert: `shoppingCacheInvalid: false`.

---

### GET /api/health (Next.js route — only remaining route)

**Auth:** none  
**Returns:** `{ db: 'ok', version: string }` or `503 { db: 'unavailable' }`

---

## 11. Component Map

### /convex/ (all backend logic)
- `schema.ts` — table definitions and types
- `users.ts` — `getProfile`, `createUser`, `updateProfile`, `uploadPhoto`
- `wardrobe.ts` — `list`, `upload`, `updateItem`
- `outfits.ts` — `generate`, `listSaved`, `save`
- `swipes.ts` — `record`
- `shopping.ts` — `list`, `regenerate`
- `weather.ts` — `get`
- `preferences.ts` — `recalculate`

### /lib/ (frontend utilities)
- `claude.ts` — all prompt constants (unchanged)
- `seasonUtils.ts` — `getCurrentSeason`, `filterBySeason` (unchanged)
- `constants.ts` — thresholds (unchanged)
- **Removed:** `supabase.ts`, `weather.ts`, `preferenceEngine.ts` (logic moved to `/convex/`)

### /components/ — all unchanged from v1.5
Components call `useQuery`/`useMutation`/`useAction` instead of `fetch`, but names, props, and layouts are identical.
