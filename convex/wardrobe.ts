import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getCurrentUser, getCurrentUserOptional } from "./users";

/** List all active wardrobe items for the signed-in user. Reactive. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOptional(ctx);
    if (!user) return null;

    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", user._id).eq("isActive", true)
      )
      .collect();

    return { items, total: items.length };
  },
});

/** Update item name and/or season tags. */
export const updateItem = mutation({
  args: {
    itemId: v.id("wardrobeItems"),
    name: v.optional(v.string()),
    seasonTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { itemId, name, seasonTags }) => {
    const user = await getCurrentUser(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError({ code: "item_not_found" });
    }
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim().slice(0, 100);
    if (seasonTags !== undefined) updates.seasonTags = seasonTags;
    await ctx.db.patch(itemId, updates);
  },
});

/** Soft-delete a wardrobe item. */
export const removeItem = mutation({
  args: { itemId: v.id("wardrobeItems") },
  handler: async (ctx, { itemId }) => {
    const user = await getCurrentUser(ctx);
    const item = await ctx.db.get(itemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError({ code: "item_not_found" });
    }
    await ctx.db.patch(itemId, { isActive: false });
  },
});

// ── Internal helpers called by the upload action ─────────────────────────────

export const countActive = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("isActive", true)
      )
      .collect();
    return items.length;
  },
});

export const insertItem = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    imageUrl: v.string(),
    name: v.string(),
    category: v.union(
      v.literal("tops"),
      v.literal("bottoms"),
      v.literal("shoes"),
      v.literal("outerwear"),
      v.literal("accessories"),
      v.literal("dresses"),
      v.literal("bags")
    ),
    colours: v.array(v.string()),
    tags: v.array(v.string()),
    seasonTags: v.array(v.string()),
    dominantColourHex: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("wardrobeItems", {
      ...args,
      isActive: true,
      aiTaggedAt: Date.now(),
    });
  },
});

export const patchItemTags = internalMutation({
  args: {
    itemId: v.id("wardrobeItems"),
    seasonTags: v.array(v.string()),
    category: v.union(
      v.literal("tops"),
      v.literal("bottoms"),
      v.literal("shoes"),
      v.literal("outerwear"),
      v.literal("accessories"),
      v.literal("dresses"),
      v.literal("bags")
    ),
    colours: v.array(v.string()),
    tags: v.array(v.string()),
    dominantColourHex: v.string(),
    name: v.string(),
  },
  handler: async (ctx, { itemId, ...fields }) => {
    await ctx.db.patch(itemId, { ...fields, aiTaggedAt: Date.now() });
  },
});

export const listAllActiveForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("isActive", true)
      )
      .collect();
  },
});

export const setShoppingCacheInvalid = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, { shoppingCacheInvalid: true });
  },
});
