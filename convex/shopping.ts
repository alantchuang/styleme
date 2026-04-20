import { query, action, internalMutation, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser, getCurrentUserOptional, getCurrentUserFromAction } from "./users";
import { HAIKU } from "../lib/claude";
import { getSeasonForMonth, hemisphereFromLat } from "../lib/seasonUtils";
import { SHOPPING_EMPTY_STATE_THRESHOLD } from "../lib/constants";
import type { Id } from "./_generated/dataModel";

// PROMPT_VERSION: shopping_gap_v2
const SHOPPING_GAP_SYSTEM = `You are a wardrobe consultant identifying genuine gaps — items that
would meaningfully expand outfit possibilities.

Rules:
- Only recommend items the user genuinely needs.
- A gap must be supported by evidence: an underserved occasion, an
  underrepresented category, or an item that unlocks multiple outfits.
- Do not recommend items they already own.
- Do not duplicate items already in existing_gaps.
- Respect the preference_summary — do not recommend avoided styles.
- Age and gender awareness: every recommendation must be appropriate
  for the user's age and gender. Do not suggest age-inappropriate items
  (e.g. micro-trends for a 55-year-old) or gender-mismatched items.
  Tailor item names and search queries accordingly.
- Age guidance:
    13–19: affordable, trend-aware, school/social occasion focused
    20–29: versatile basics, transition to professional wear if needed
    30–39: investment pieces, smart casual, work-ready staples
    40–49: quality classics, refined casual, elevated wardrobe staples
    50+: timeless cuts, quality fabrics, comfortable yet polished
- Gender guidance:
    female: recommend feminine or gender-neutral items (blouses, skirts,
      dresses, feminine trousers, heels, flats, bags, jewellery)
    male: recommend men's items (button-downs, chinos, tailored trousers,
      leather shoes, sneakers, belts, watches)
    not specified: recommend gender-neutral versatile items
- season_relevance:
    current = useful this season
    upcoming = useful next season
    off-season = not needed for 6+ months
- compatible_item_ids: existing wardrobe IDs this purchase would pair with.
- search_query: specific Google Shopping query, under 8 words, include
  gender where helpful (e.g. "women's tailored blazer" or "men's slim chinos").
- Return 3-6 gaps maximum.

Return ONLY a valid JSON array. No markdown.

Gap schema:
{
  "item_name": string,
  "reason": string,
  "priority": "high"|"medium"|"low",
  "affected_occasions": string[],
  "compatible_item_ids": string[],
  "search_query": string,
  "season_relevance": "current"|"upcoming"|"off-season"
}`;

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const SEASON_ORDER: Record<string, number> = { current: 0, upcoming: 1, "off-season": 2 };

/** Reactive query — returns shopping gaps with denormalised compatible items. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOptional(ctx);
    if (!user) return null;

    if (user.totalSwipes < SHOPPING_EMPTY_STATE_THRESHOLD) {
      return { gaps: [], isStale: false, regenerating: false };
    }

    const rawGaps = await ctx.db
      .query("shoppingGaps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Sort: current season first → high priority first → most occasions first
    rawGaps.sort((a, b) => {
      const sDiff =
        (SEASON_ORDER[a.seasonRelevance] ?? 2) - (SEASON_ORDER[b.seasonRelevance] ?? 2);
      if (sDiff !== 0) return sDiff;
      const pDiff = (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      if (pDiff !== 0) return pDiff;
      return b.affectedOccasions.length - a.affectedOccasions.length;
    });

    // Denormalise compatible items
    const gaps = await Promise.all(
      rawGaps.map(async (gap) => {
        const compatibleItems = (
          await Promise.all(gap.compatibleItemIds.map((id) => ctx.db.get(id)))
        )
          .filter((item): item is NonNullable<typeof item> => item !== null && item.isActive)
          .map((item) => ({
            _id: item._id,
            name: item.name,
            dominantColourHex: item.dominantColourHex,
            category: item.category,
          }));

        return { ...gap, compatibleItems };
      })
    );

    return {
      gaps,
      isStale: user.shoppingCacheInvalid,
      regenerating: false,
    };
  },
});

/** Returns a single gap by ID (for GapDetail page). */
export const getGap = query({
  args: { gapId: v.id("shoppingGaps") },
  handler: async (ctx, { gapId }) => {
    const user = await getCurrentUser(ctx);

    const gap = await ctx.db.get(gapId);
    if (!gap || gap.userId !== user._id) return null;

    const compatibleItems = (
      await Promise.all(gap.compatibleItemIds.map((id) => ctx.db.get(id)))
    )
      .filter((item): item is NonNullable<typeof item> => item !== null && item.isActive)
      .map((item) => ({
        _id: item._id,
        name: item.name,
        dominantColourHex: item.dominantColourHex,
        category: item.category,
        imageUrl: item.imageUrl,
      }));

    return { ...gap, compatibleItems };
  },
});

function calcAge(dob: string | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  return age;
}

/** Regenerate shopping gap recommendations using Claude. */
export const regenerate = action({
  args: {},
  handler: async (ctx): Promise<{ gapsGenerated: number }> => {
    const { internal } = await import("./_generated/api");

    const user = await getCurrentUserFromAction(ctx);

    if (user.totalSwipes < SHOPPING_EMPTY_STATE_THRESHOLD) {
      return { gapsGenerated: 0 };
    }

    const wardrobeItems = await ctx.runQuery(internal.shopping.getWardrobeForShopping, {
      userId: user._id,
    });

    if (wardrobeItems.length === 0) {
      return { gapsGenerated: 0 };
    }

    const existingGaps = await ctx.runQuery(internal.shopping.getExistingGaps, {
      userId: user._id,
    });
    const topOccasions = await ctx.runQuery(internal.shopping.getTopOccasions, {
      userId: user._id,
    });

    const month = new Date().getMonth() + 1;
    const season = getSeasonForMonth(month, hemisphereFromLat(user.locationLat));

    const wardrobeLines = wardrobeItems
      .map(
        (i) =>
          `${i._id} | ${i.name} | ${i.category} | ${i.colours.join(",")} | ${i.seasonTags.join(",")} | ${i.tags.join(",")}`
      )
      .join("\n");

    const age = calcAge(user.dateOfBirth);

    const userMessage = `Identify this user's most important missing wardrobe items.

=== USER PROFILE ===
Age: ${age ?? "not specified"}
Gender: ${user.gender ?? "not specified"}

=== CURRENT SEASON: ${season} ===

=== PREFERENCE SUMMARY ===
${JSON.stringify(user.preferenceSummary ?? {})}

=== FULL WARDROBE (including out-of-season) ===
ID | Name | Category | Colours | Season tags | Tags
${wardrobeLines}

=== OCCASIONS THIS USER DRESSES FOR ===
${topOccasions.join(", ") || "Casual"}

=== EXISTING GAPS (do not duplicate) ===
${existingGaps.map((g) => g.itemName).join(", ") || "None"}

Return 3-6 gap objects as a JSON array.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let rawGaps: unknown[] | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await anthropic.messages.create({
          model: HAIKU,
          max_tokens: 1500,
          system: SHOPPING_GAP_SYSTEM,
          messages: [{ role: "user", content: userMessage }],
        });
        const text = res.content[0]?.type === "text" ? res.content[0].text : "";
        const clean = text.replace(/```json|```/g, "").trim();
        rawGaps = JSON.parse(clean);
        break;
      } catch (err) {
        console.error("shopping.regenerate: Claude call failed", {
          userId: user._id,
          attempt,
          err: String(err),
        });
        if (attempt === 1) throw new ConvexError({ code: "generation_failed" });
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!Array.isArray(rawGaps)) {
      throw new ConvexError({ code: "generation_failed" });
    }

    if (rawGaps.length > 6) rawGaps = rawGaps.slice(0, 6);

    const itemIdSet = new Set(wardrobeItems.map((i) => String(i._id)));

    const validGaps = (rawGaps as Record<string, unknown>[])
      .filter((g) => g.item_name && g.reason)
      .map((g) => {
        const validPriority = (p: unknown): p is "high" | "medium" | "low" =>
          p === "high" || p === "medium" || p === "low";
        const validSeason = (s: unknown): s is "current" | "upcoming" | "off-season" =>
          s === "current" || s === "upcoming" || s === "off-season";

        const rawCompatible = Array.isArray(g.compatible_item_ids) ? g.compatible_item_ids : [];
        const compatibleItemIds = rawCompatible
          .filter((id: unknown) => typeof id === "string" && itemIdSet.has(id))
          .slice(0, 10) as Id<"wardrobeItems">[];

        return {
          itemName: String(g.item_name),
          reason: String(g.reason),
          priority: validPriority(g.priority) ? g.priority : ("medium" as const),
          affectedOccasions: Array.isArray(g.affected_occasions)
            ? (g.affected_occasions as unknown[]).map(String)
            : [],
          compatibleItemIds,
          searchQuery: String(g.search_query ?? "").slice(0, 100),
          seasonRelevance: validSeason(g.season_relevance)
            ? g.season_relevance
            : ("current" as const),
        };
      });

    // Fetch a Pexels image for each gap in parallel
    const gapsWithImages = await Promise.all(
      validGaps.map(async (gap) => {
        const imageUrl = await fetchPexelsImage(gap.searchQuery);
        return { ...gap, imageUrl };
      })
    );

    await ctx.runMutation(internal.shopping.upsertGaps, {
      userId: user._id,
      gaps: gapsWithImages,
    });

    return { gapsGenerated: validGaps.length };
  },
});

async function fetchPexelsImage(query: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`,
      { headers: { Authorization: process.env.PEXELS_API_KEY ?? "" } }
    );
    if (!res.ok) return undefined;
    const data = await res.json() as { photos?: { src?: { medium?: string } }[] };
    return data.photos?.[0]?.src?.medium ?? undefined;
  } catch {
    return undefined;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

export const getWardrobeForShopping = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("wardrobeItems")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .collect();
  },
});

export const getExistingGaps = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("shoppingGaps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getTopOccasions = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const swipes = await ctx.db
      .query("outfitSwipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    const counts = new Map<string, number>();
    for (const s of swipes) {
      counts.set(s.occasion, (counts.get(s.occasion) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([occ]) => occ);
  },
});

export const upsertGaps = internalMutation({
  args: {
    userId: v.id("users"),
    gaps: v.array(
      v.object({
        itemName: v.string(),
        reason: v.string(),
        priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
        affectedOccasions: v.array(v.string()),
        compatibleItemIds: v.array(v.id("wardrobeItems")),
        searchQuery: v.string(),
        seasonRelevance: v.union(
          v.literal("current"),
          v.literal("upcoming"),
          v.literal("off-season")
        ),
        imageUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { userId, gaps }) => {
    // Delete existing gaps
    const existing = await ctx.db
      .query("shoppingGaps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const gap of existing) {
      await ctx.db.delete(gap._id);
    }

    // Insert new gaps
    for (const gap of gaps) {
      await ctx.db.insert("shoppingGaps", {
        userId,
        itemName: gap.itemName,
        reason: gap.reason,
        priority: gap.priority,
        affectedOccasions: gap.affectedOccasions,
        compatibleItemIds: gap.compatibleItemIds,
        searchQuery: gap.searchQuery,
        seasonRelevance: gap.seasonRelevance,
        imageUrl: gap.imageUrl,
      });
    }

    // Mark cache valid
    await ctx.db.patch(userId, { shoppingCacheInvalid: false });
  },
});
