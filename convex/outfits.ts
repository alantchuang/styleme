import { action, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrentUser, getCurrentUserOptional, getCurrentUserFromAction } from "./users";
import { getSeasonForMonth, filterBySeason, hemisphereFromLat } from "../lib/seasonUtils";
import { SONNET } from "../lib/claude";
import type { Id } from "./_generated/dataModel";

type DenormalisedItem = {
  _id: string;
  name: string;
  category: string;
  dominantColourHex: string;
  imageUrl: string;
};

type DenormalisedOutfit = {
  _id: string;
  outfitIndex: number;
  itemIds: string[];
  heroItemId: string;
  items: DenormalisedItem[];
  occasion: string;
  weatherCondition: string | null;
  weatherTempC: number | null;
  season: string;
  reasoning: string;
  colourPalette: string[];
  styleTags: string[];
  gapSuggestion: {
    itemName: string;
    reason: string;
    priority: "high" | "medium" | "low";
    searchQuery: string;
  } | null;
};

type GenerateResult = {
  outfits: DenormalisedOutfit[];
  batchId: string;
  isPartial?: boolean;
};

// PROMPT_VERSION: outfit_generation_v7
const OUTFIT_GENERATION_SYSTEM = `Think like a professional personal stylist presenting to a client.
Every outfit should be complete and wearable as-is — nothing missing,
nothing doubled up. If a category has no suitable items in the wardrobe,
note the gap in gap_suggestion rather than omitting the category silently.

You are StyleMe, a personal AI stylist with deep knowledge of fashion,
colour theory, and body proportion. You create personalised outfit
combinations from a user's existing wardrobe — you never suggest items
they don't own.

Task: generate exactly 5 distinct outfit combinations.

Outfit composition rules:
- Every outfit MUST have exactly one item from each of these:
    tops (or dresses), bottoms (skip if dress), shoes
- Every outfit MAY have at most one of each:
    outerwear, accessories, bags
- NEVER include two items from the same category in one outfit.
  Two tops, two shoes, two bottoms = invalid.
- If the user's wardrobe lacks a required category (e.g. no shoes),
  omit that slot — do not substitute from another category.
- A dress replaces both tops and bottoms — do not add either
  when a dress is the hero item.
- ACCESSORIES: include accessories (bags, jewellery, scarves, belts)
  whenever they are available in the wardrobe — treat them as
  finishing pieces a real stylist would always consider. Do not
  habitually skip accessories.
- Tops and bottoms must be unique across all 5 outfits (no item repeats).
- Shoes and accessories MAY repeat across outfits — the user likely
  owns fewer of these and repeating them is realistic.
- Every outfit must suit the specified occasion and weather.
- The preference_summary overrides general fashion advice — honour it.
- Colour harmony: neutrals anchor the outfit, max one accent colour.
- Proportion: pair fitted items with relaxed ones where possible.

Before returning, verify each outfit:
- Exactly one top or dress (not both)
- Exactly one bottom (unless dress)
- Exactly one pair of shoes
- No two items from the same category
- No item repeated across outfits
If any outfit fails, fix it before returning.

Age and gender styling rules (use age and gender from the user profile):
- Always style for the user's actual age and gender — not a default.
- Age 13–19: trend-aware and age-appropriate. Casual, expressive,
  youthful energy. Avoid overly mature, formal, or revealing styles.
- Age 20–29: versatile. Mix trend-forward pieces with investment basics.
  Experiment with colour and silhouette.
- Age 30–39: balance style with polish. Smart casual and elevated
  casual work well. Quality over trend-chasing.
- Age 40–49: refined and confident. Lean on classic silhouettes with
  personal flair. Avoid overly youthful micro-trends.
- Age 50+: timeless and well-fitted. Focus on quality and proportion.
  Classic styling with modern, current touches. Avoid very tight or
  very oversized extremes.
- Gender female: favour feminine silhouettes and cuts where appropriate
  (blouses, dresses, skirts, feminine trousers). Apply body proportion
  rules with a women's fashion lens.
- Gender male: favour clean, structured men's looks (chinos, button-downs,
  tailored trousers, crew-neck knits, leather or clean sneakers). Apply
  proportion rules with a men's fashion lens.
- If gender is not specified: use a gender-neutral, inclusive approach.

Body proportion rules (use body_silhouette and fit_preferences):
- pear: favour A-line or flared cuts for bottoms; fitted or structured
  tops to balance proportions.
- inverted_triangle: avoid very wide-shouldered outerwear.
- apple: avoid tight waistbands; favour flowy midlayers.
- petite: avoid oversized items that overwhelm the frame; favour
  cropped or fitted proportions.
- hourglass: most silhouettes work; honour the stated fit_preferences.
- rectangle: structured and tailored items add shape definition.
Always honour stated fit_preferences unless they create an unflattering
proportion mismatch — in that case, note it in the reasoning.

Appearance context: profile_photo_summary gives a text description of
the user's colouring. Use this to bias colour palette choices.

Weather handling: if weather is 'not available', use season and wardrobe
tags to infer appropriate items. Do not mention missing weather.

Occasion handling: if occasion is a custom free-text value, treat it as
the styling context even if unusual. If it appears nonsensical, default
to casual occasion logic.

hero_item_id: the outfit's standout piece.
gap_suggestion: if a missing item would significantly improve the outfit,
  suggest it — tailored to the user's age and gender (e.g. "tailored chinos"
  for a 40-year-old male, "midi wrap skirt" for a 35-year-old female,
  "chunky sneakers" for a 19-year-old). Otherwise null.
style_tags: 2-4 descriptors (minimal, relaxed, earth-toned, structured).
colour_palette: 2-4 hex values from dominant_colour_hex fields.
reasoning: 1-3 plain English sentences. Reference weather, occasion,
  and specific items. Write as a knowledgeable friend.

Return ONLY a valid JSON array of 5 outfit objects. No markdown.

Outfit schema:
{
  "outfit_index": number,
  "item_ids": string[],
  "hero_item_id": string,
  "occasion": string,
  "weather_condition": string | null,
  "weather_temp_c": number | null,
  "season": string,
  "reasoning": string,
  "colour_palette": string[],
  "style_tags": string[],
  "gap_suggestion": {
    "item_name": string,
    "reason": string,
    "priority": "high"|"medium"|"low",
    "search_query": string
  } | null
}`;

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

export const generate = action({
  args: {
    occasion: v.string(),
    weatherCondition: v.union(v.string(), v.null()),
    weatherTempC: v.union(v.number(), v.null()),
    month: v.optional(v.number()), // 1-12 from client local time
  },
  handler: async (ctx, { occasion, weatherCondition, weatherTempC, month }): Promise<GenerateResult> => {
    const { internal } = await import("./_generated/api");

    // 1. Validate occasion
    const sanitised = occasion.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!sanitised) throw new ConvexError({ code: "missing_occasion" });
    if (occasion.trim().length > 80) throw new ConvexError({ code: "occasion_too_long" });

    // 2. Get user
    const user = await getCurrentUserFromAction(ctx);

    // 3. Get wardrobe
    const allItems = await ctx.runQuery(internal.outfitsInternal.getWardrobeForGeneration, {
      userId: user._id,
    });

    // 4. Apply season filter
    const effectiveMonth = month ?? new Date().getMonth() + 1;
    const season = getSeasonForMonth(effectiveMonth, hemisphereFromLat(user.locationLat));
    const seasonFiltered = filterBySeason(allItems, season);

    if (seasonFiltered.length === 0) {
      throw new ConvexError({ code: "no_wardrobe_items" });
    }

    // 5. Truncate to 40 (occasion-relevant first, then most-recent)
    // Always reserve slots for shoes and outerwear so Claude can build complete outfits.
    let wardrobeForPrompt = seasonFiltered;
    if (seasonFiltered.length > 40) {
      const occasionLower = sanitised.toLowerCase();

      // Always include all shoes and outerwear (these are scarce — Claude needs them)
      const alwaysInclude = seasonFiltered.filter(
        (i) => i.category === "shoes" || i.category === "outerwear"
      );
      const alwaysIncludeIds = new Set(alwaysInclude.map((i) => i._id));

      const remaining = seasonFiltered.filter((i) => !alwaysIncludeIds.has(i._id));
      const relevant = remaining.filter((i) =>
        i.tags.some((t) => t.toLowerCase().includes(occasionLower))
      );
      const relevantIds = new Set(relevant.map((i) => i._id));
      const others = remaining
        .filter((i) => !relevantIds.has(i._id))
        .sort((a, b) => (b.aiTaggedAt ?? 0) - (a.aiTaggedAt ?? 0));

      const slots = Math.max(0, 40 - alwaysInclude.length);
      wardrobeForPrompt = [...alwaysInclude, ...relevant, ...others].slice(
        0,
        alwaysInclude.length + slots
      );
      console.warn("Wardrobe truncated", { total: seasonFiltered.length, sent: wardrobeForPrompt.length });
    }

    // 6. Build prompt
    const weatherStr =
      weatherCondition && weatherTempC != null
        ? `${weatherCondition}, ${weatherTempC}C`
        : "not available";

    const wardrobeLines = wardrobeForPrompt
      .map(
        (i) =>
          `${i._id} | ${i.name} | ${i.category} | ${i.colours.join(",")} | ${i.tags.join(",")} | ${i.dominantColourHex}`
      )
      .join("\n");

    const age = calcAge(user.dateOfBirth);

    const userMessage = `Generate 5 outfit combinations for this user.

=== USER PROFILE ===
Age: ${age ?? "not specified"}
Gender: ${user.gender ?? "not specified"}
Height: ${user.heightCm ?? "not specified"}cm
Body silhouette: ${user.bodySilhouette ?? "not specified"}
Fit preference: ${user.fitPreferences?.join(", ") || "no preference stated"}
Hair: ${user.hairColour ?? "not specified"}, ${user.hairStyle ?? "not specified"}
Appearance: ${user.profilePhotoSummary ?? "not available"}
Style preferences: ${user.stylePreferences?.join(", ") || "none stated"}

=== PREFERENCE SUMMARY (from swipe history) ===
${JSON.stringify(user.preferenceSummary ?? {})}

=== CONTEXT ===
Occasion: ${sanitised}
Weather: ${weatherStr}
Season: ${season}

=== WARDROBE INVENTORY (season-filtered, max 40 items) ===
ID | Name | Category | Colours | Tags | Dominant hex
${wardrobeLines}

Return 5 outfit objects as a JSON array.`;

    // 7. Call Claude (2 attempts, 1s backoff)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let rawOutfits: unknown[] | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await anthropic.messages.create({
          model: SONNET,
          max_tokens: 4096,
          system: OUTFIT_GENERATION_SYSTEM,
          messages: [{ role: "user", content: userMessage }],
        });
        const text = res.content[0]?.type === "text" ? res.content[0].text : "";
        // Extract JSON array robustly — Claude sometimes wraps it in prose or code fences
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        const clean = arrayMatch
          ? arrayMatch[0]
          : text.replace(/```json\n?|```/g, "").trim();
        rawOutfits = JSON.parse(clean);
        break;
      } catch (err) {
        console.error("outfits.generate: Claude call failed", {
          userId: user._id,
          attempt,
          err: String(err),
        });
        if (attempt === 1) throw new ConvexError({ code: "generation_failed" });
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!Array.isArray(rawOutfits)) {
      throw new ConvexError({ code: "generation_failed" });
    }

    // 8. Validate — truncate to 5, strip unknown item IDs
    if (rawOutfits.length > 5) rawOutfits = rawOutfits.slice(0, 5);
    if (rawOutfits.length < 5) {
      console.warn("outfits.generate: Claude returned fewer than 5 outfits", {
        count: rawOutfits.length,
      });
    }

    const itemMap = new Map(wardrobeForPrompt.map((i) => [String(i._id), i]));

    type ValidatedOutfit = {
      itemIds: Id<"wardrobeItems">[];
      heroItemId: Id<"wardrobeItems">;
      occasion: string;
      weatherCondition?: string;
      weatherTempC?: number;
      season: string;
      reasoning: string;
      gapSuggestion?: {
        itemName: string;
        reason: string;
        priority: "high" | "medium" | "low";
        searchQuery: string;
      };
      styleTags: string[];
      colourPalette: string[];
    };

    const validOutfits: ValidatedOutfit[] = [];

    for (const raw of rawOutfits as Record<string, unknown>[]) {
      const rawItemIds = (raw.item_ids as string[] | undefined) ?? [];
      const allValidItems = rawItemIds
        .filter((id) => itemMap.has(id))
        .map((id) => itemMap.get(id)!);

      // Deduplicate by category — keep only the first item per category per outfit.
      // This is a server-side safety net for all categories, not just shoes.
      const seenCategories = new Set<string>();
      const validItems = allValidItems.filter((item) => {
        if (seenCategories.has(item.category)) return false;
        seenCategories.add(item.category);
        return true;
      });

      if (validItems.length < 2) continue;

      // Structural completeness check — safety net so incomplete outfits never reach the user
      const cats = new Set(validItems.map((i) => i.category));
      const hasTopOrDress = cats.has("tops") || cats.has("dresses");
      const hasBottomOrDress = cats.has("bottoms") || cats.has("dresses");
      const hasShoes = cats.has("shoes");
      // Only enforce shoes/bottoms if those categories exist in the wardrobe
      const wardrobeHasShoes = wardrobeForPrompt.some((i) => i.category === "shoes");
      const wardrobeHasBottoms = wardrobeForPrompt.some(
        (i) => i.category === "bottoms" || i.category === "dresses"
      );
      if (!hasTopOrDress) continue;
      if (wardrobeHasBottoms && !hasBottomOrDress) continue;
      if (wardrobeHasShoes && !hasShoes) continue;

      const heroId = String(raw.hero_item_id ?? "");
      const heroItemId = (
        itemMap.has(heroId) ? heroId : String(validItems[0]._id)
      ) as Id<"wardrobeItems">;

      const gap = raw.gap_suggestion as Record<string, unknown> | null | undefined;
      const validPriority = (p: unknown): p is "high" | "medium" | "low" =>
        p === "high" || p === "medium" || p === "low";

      validOutfits.push({
        itemIds: validItems.map((i) => i._id),
        heroItemId,
        occasion: sanitised,
        weatherCondition: weatherCondition ?? undefined,
        weatherTempC: weatherTempC ?? undefined,
        season,
        reasoning: String(raw.reasoning ?? ""),
        gapSuggestion: gap
          ? {
              itemName: String(gap.item_name ?? ""),
              reason: String(gap.reason ?? ""),
              priority: validPriority(gap.priority) ? gap.priority : "medium",
              searchQuery: String(gap.search_query ?? ""),
            }
          : undefined,
        styleTags: ((raw.style_tags as string[] | undefined) ?? []).slice(0, 4),
        colourPalette: ((raw.colour_palette as string[] | undefined) ?? []).slice(0, 4),
      });
    }

    const isPartial = validOutfits.length < 3;

    // 9. Insert
    const batchId = crypto.randomUUID();
    const insertedIds = await ctx.runMutation(internal.outfitsInternal.insertBatch, {
      userId: user._id,
      batchId,
      outfits: validOutfits,
    });

    // 10. Return denormalised batch
    const denormalised = validOutfits.map((outfit, i) => ({
      _id: String(insertedIds[i]),
      outfitIndex: i,
      itemIds: outfit.itemIds.map(String),
      heroItemId: String(outfit.heroItemId),
      items: outfit.itemIds
        .map((id) => {
          const item = itemMap.get(String(id));
          if (!item) return null;
          return {
            _id: String(item._id),
            name: item.name,
            category: item.category,
            dominantColourHex: item.dominantColourHex,
            imageUrl: item.imageUrl,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
      occasion: outfit.occasion,
      weatherCondition: outfit.weatherCondition ?? null,
      weatherTempC: outfit.weatherTempC ?? null,
      season: outfit.season,
      reasoning: outfit.reasoning,
      colourPalette: outfit.colourPalette,
      styleTags: outfit.styleTags,
      gapSuggestion: outfit.gapSuggestion ?? null,
    }));

    return { outfits: denormalised, batchId, isPartial: isPartial || undefined };
  },
});

export const listSaved = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOptional(ctx);
    if (!user) return null;
    return ctx.db
      .query("outfits")
      .withIndex("by_user_saved", (q) => q.eq("userId", user._id).eq("isSaved", true))
      .collect();
  },
});

export const save = mutation({
  args: { outfitId: v.id("outfits") },
  handler: async (ctx, { outfitId }) => {
    const user = await getCurrentUser(ctx);
    const outfit = await ctx.db.get(outfitId);
    if (!outfit || outfit.userId !== user._id) {
      throw new ConvexError({ code: "outfit_not_found" });
    }
    await ctx.db.patch(outfitId, { isSaved: true });
  },
});

export const unsave = mutation({
  args: { outfitId: v.id("outfits") },
  handler: async (ctx, { outfitId }) => {
    const user = await getCurrentUser(ctx);
    const outfit = await ctx.db.get(outfitId);
    if (!outfit || outfit.userId !== user._id) {
      throw new ConvexError({ code: "outfit_not_found" });
    }
    await ctx.db.patch(outfitId, { isSaved: false });
  },
});

export const markWorn = mutation({
  args: { outfitId: v.id("outfits") },
  handler: async (ctx, { outfitId }) => {
    const user = await getCurrentUser(ctx);
    const outfit = await ctx.db.get(outfitId);
    if (!outfit || outfit.userId !== user._id) {
      throw new ConvexError({ code: "outfit_not_found" });
    }
    const today = new Date().toISOString().slice(0, 10);
    if (!outfit.wornOn.includes(today)) {
      await ctx.db.patch(outfitId, { wornOn: [...outfit.wornOn, today] });
    }
  },
});
