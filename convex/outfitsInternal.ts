import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/** Fetch all active wardrobe items for a user — used by the generate action. */
export const getWardrobeForGeneration = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return ctx.db
      .query("wardrobeItems")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .collect();
  },
});

/** Insert a batch of generated outfits — used by the generate action. */
export const insertBatch = internalMutation({
  args: {
    userId: v.id("users"),
    batchId: v.string(),
    outfits: v.array(
      v.object({
        itemIds: v.array(v.id("wardrobeItems")),
        heroItemId: v.id("wardrobeItems"),
        occasion: v.string(),
        weatherCondition: v.optional(v.string()),
        weatherTempC: v.optional(v.number()),
        season: v.string(),
        reasoning: v.string(),
        gapSuggestion: v.optional(
          v.object({
            itemName: v.string(),
            reason: v.string(),
            priority: v.union(
              v.literal("high"),
              v.literal("medium"),
              v.literal("low")
            ),
            searchQuery: v.string(),
          })
        ),
        styleTags: v.array(v.string()),
        colourPalette: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, { userId, batchId, outfits }) => {
    const ids: Id<"outfits">[] = [];
    for (const outfit of outfits) {
      const id = await ctx.db.insert("outfits", {
        userId,
        batchId,
        isSaved: false,
        wornOn: [],
        itemIds: outfit.itemIds,
        heroItemId: outfit.heroItemId,
        occasion: outfit.occasion,
        weatherCondition: outfit.weatherCondition,
        weatherTempC: outfit.weatherTempC,
        season: outfit.season,
        reasoning: outfit.reasoning,
        gapSuggestion: outfit.gapSuggestion,
        styleTags: outfit.styleTags,
        colourPalette: outfit.colourPalette,
      });
      ids.push(id);
    }
    return ids;
  },
});
