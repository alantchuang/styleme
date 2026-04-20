import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  users: defineTable({
    clerkId:               v.string(),
    displayName:           v.string(),
    dateOfBirth:           v.string(),
    gender:                v.optional(v.union(v.literal("female"), v.literal("male"))),
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
    hemisphere:            v.optional(v.union(v.literal("northern"), v.literal("southern"))),
    locationLat:           v.optional(v.number()),
    locationLng:           v.optional(v.number()),
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
    likedCount:            v.optional(v.number()),
    contextMode:           v.union(v.literal("cold_start"), v.literal("auto_detect")),
    shoppingCacheInvalid:  v.boolean(),
    onboardingComplete:    v.optional(v.boolean()),
  }).index("by_clerk_id", ["clerkId"]),

  wardrobeItems: defineTable({
    userId:            v.id("users"),
    storageId:         v.optional(v.id("_storage")),
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
    imageUrl:          v.optional(v.string()),
  }).index("by_user", ["userId"]),

});
