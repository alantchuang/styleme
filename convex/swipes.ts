import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { getCurrentUser, getCurrentUserOptional } from "./users";
import { COLD_START_SWIPE_THRESHOLD } from "../lib/constants";

export const record = mutation({
  args: {
    outfitId: v.id("outfits"),
    liked: v.boolean(),
  },
  handler: async (ctx, { outfitId, liked }) => {
    const user = await getCurrentUser(ctx);

    const outfit = await ctx.db.get(outfitId);
    if (!outfit || outfit.userId !== user._id) {
      throw new ConvexError({ code: "outfit_not_found" });
    }

    // Insert swipe — double-swipe race: both inserts succeed (acceptable noise per spec)
    const swipeId = await ctx.db.insert("outfitSwipes", {
      userId: user._id,
      outfitId,
      liked,
      occasion: outfit.occasion,
      weatherCondition: outfit.weatherCondition,
      weatherTempC: outfit.weatherTempC,
    });

    // Mark outfit as saved so it appears in the Saved tab
    if (liked) {
      await ctx.db.patch(outfitId, { isSaved: true });
    }

    // Update user doc atomically
    const newTotal = user.totalSwipes + 1;
    const newContextMode =
      newTotal >= COLD_START_SWIPE_THRESHOLD ? "auto_detect" : user.contextMode;
    const newLikedCount = (user.likedCount ?? 0) + (liked ? 1 : 0);

    await ctx.db.patch(user._id, {
      totalSwipes: newTotal,
      likedCount: newLikedCount,
      contextMode: newContextMode,
      shoppingCacheInvalid: true,
    });

    // Schedule async preference recalc every 5 swipes — failure logged, never surfaced
    const preferenceRecalcTriggered = newTotal % 5 === 0;
    if (preferenceRecalcTriggered) {
      await ctx.scheduler.runAfter(0, internal.preferences.recalculate, {
        userId: user._id,
      });
    }

    return {
      swipeId,
      newTotalSwipes: newTotal,
      contextMode: newContextMode,
      preferenceRecalcTriggered,
    };
  },
});

/** Reactive query — returns liked count for ProfileSheet stat card. */
export const getLikedCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOptional(ctx);
    if (!user) return null;
    return user.likedCount ?? 0;
  },
});
