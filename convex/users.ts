import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalQuery,
  internalMutation,
  QueryCtx,
  MutationCtx,
  ActionCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";

const VALID_SILHOUETTES = [
  "hourglass", "rectangle", "pear", "inverted_triangle", "apple", "petite",
] as const;

const VALID_FIT_PREFERENCES = ["oversized", "relaxed", "fitted", "tailored"] as const;

/** Validate that a date of birth string indicates the user is at least 13 years old. */
function validateAge(dateOfBirth: string): void {
  const birthDate = new Date(dateOfBirth);
  if (isNaN(birthDate.getTime())) {
    throw new ConvexError({ code: "invalid_dob", message: "Invalid date of birth." });
  }
  const today = new Date();
  const thirteenYearsAgo = new Date(
    today.getFullYear() - 13,
    today.getMonth(),
    today.getDate()
  );
  if (birthDate > thirteenYearsAgo) {
    throw new ConvexError({ code: "too_young", message: "You must be 13 or older to use StyleMe." });
  }
}

/**
 * Called on first sign-in to ensure a Convex user document exists.
 * Creates one from Clerk identity if missing (social login / no webhook).
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) return existing._id;

    const displayName =
      identity.name ?? identity.email?.split("@")[0] ?? "StyleMe User";

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      displayName,
      dateOfBirth: "2000-01-01",
      stylePreferences: [],
      fitPreferences: [],
      totalSwipes: 0,
      contextMode: "cold_start",
      shoppingCacheInvalid: false,
    });
  },
});

/**
 * Called by Clerk webhook after sign-up.
 * Validates age >= 13, creates user document.
 */
export const createUser = mutation({
  args: {
    clerkId: v.string(),
    displayName: v.string(),
    dateOfBirth: v.string(),
  },
  handler: async (ctx, args) => {
    validateAge(args.dateOfBirth);

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      displayName: args.displayName,
      dateOfBirth: args.dateOfBirth,
      stylePreferences: [],
      fitPreferences: [],
      totalSwipes: 0,
      contextMode: "cold_start",
      shoppingCacheInvalid: false,
    });
  },
});

/** Get the authenticated user's profile. Returns null when unauthenticated. */
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

/** Update editable profile fields. Validates silhouette and fit preferences. */
export const updateProfile = mutation({
  args: {
    displayName:    v.optional(v.string()),
    dateOfBirth:    v.optional(v.string()),
    gender:         v.optional(v.union(v.literal("female"), v.literal("male"))),
    heightCm:       v.optional(v.number()),
    hairColour:     v.optional(v.string()),
    hairStyle:      v.optional(v.string()),
    bodySilhouette: v.optional(v.string()),
    fitPreferences: v.optional(v.array(v.string())),
    stylePreferences: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (args.bodySilhouette !== undefined) {
      if (!(VALID_SILHOUETTES as readonly string[]).includes(args.bodySilhouette)) {
        throw new ConvexError({ code: "invalid_silhouette" });
      }
    }

    if (args.fitPreferences !== undefined) {
      if (args.fitPreferences.length > 2) {
        throw new ConvexError({ code: "too_many_fit_preferences" });
      }
      for (const pref of args.fitPreferences) {
        if (!(VALID_FIT_PREFERENCES as readonly string[]).includes(pref)) {
          throw new ConvexError({ code: "invalid_fit_preference" });
        }
      }
    }

    const patch: Record<string, unknown> = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName;
    if (args.dateOfBirth !== undefined) {
      validateAge(args.dateOfBirth);
      patch.dateOfBirth = args.dateOfBirth;
    }
    if (args.gender !== undefined) patch.gender = args.gender;
    if (args.heightCm !== undefined) patch.heightCm = args.heightCm;
    if (args.hairColour !== undefined) patch.hairColour = args.hairColour;
    if (args.hairStyle !== undefined) patch.hairStyle = args.hairStyle;
    if (args.bodySilhouette !== undefined) patch.bodySilhouette = args.bodySilhouette;
    if (args.fitPreferences !== undefined) patch.fitPreferences = args.fitPreferences;
    if (args.stylePreferences !== undefined) patch.stylePreferences = args.stylePreferences;
    await ctx.db.patch(user._id, patch);
  },
});

/** Mark onboarding as complete. */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, { onboardingComplete: true });
  },
});

/** Save user location as lat/lng coordinates. */
export const saveLocation = mutation({
  args: {
    locationLat: v.number(),
    locationLng: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await ctx.db.patch(user._id, {
      locationLat: args.locationLat,
      locationLng: args.locationLng,
    });
    return { updated: true };
  },
});

/** Internal mutation: persist photo URL and Claude summary. Called by uploadPhoto action. */
export const savePhoto = internalMutation({
  args: {
    userId:             v.id("users"),
    storageId:          v.id("_storage"),
    profilePhotoUrl:    v.string(),
    profilePhotoSummary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      profilePhotoStorageId: args.storageId,
      profilePhotoUrl:       args.profilePhotoUrl,
      profilePhotoSummary:   args.profilePhotoSummary,
    });
  },
});

/** Internal query: look up user by clerkId — used by getCurrentUserFromAction. */
export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
  },
});

/** Auth helper for queries — returns null when unauthenticated instead of throwing. */
export async function getCurrentUserOptional(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

/** Auth helper for queries and mutations (ctx.db is available). */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "unauthenticated" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new ConvexError({ code: "user_not_found" });
  return user;
}

/** Auth helper for actions (ctx.db is NOT available). */
export async function getCurrentUserFromAction(ctx: ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "unauthenticated" });
  const user = await ctx.runQuery(internal.users.getByClerkId, { clerkId: identity.subject });
  if (!user) throw new ConvexError({ code: "user_not_found" });
  return user;
}

/** Internal query: get storage IDs and clerkId for account deletion. */
export const getUserStorageIds = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return {
      profilePhotoStorageId: user?.profilePhotoStorageId ?? null,
      wardrobeStorageIds: items.map((i) => i.storageId as string),
      clerkId: user?.clerkId ?? null,
    };
  },
});

/** Internal mutation: delete all documents for a user across all tables. */
export const deleteAllUserDocs = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const swipes = await ctx.db
      .query("outfitSwipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const s of swipes) await ctx.db.delete(s._id);

    const outfits = await ctx.db
      .query("outfits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const o of outfits) await ctx.db.delete(o._id);

    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const i of items) await ctx.db.delete(i._id);

    const gaps = await ctx.db
      .query("shoppingGaps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const g of gaps) await ctx.db.delete(g._id);

    await ctx.db.delete(userId);
  },
});

/** Permanently delete the authenticated user's account and all associated data. */
export const deleteAccount = action({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserFromAction(ctx);

    const { profilePhotoStorageId, wardrobeStorageIds, clerkId } =
      await ctx.runQuery(internal.users.getUserStorageIds, { userId: user._id });

    // Delete wardrobe item files from Convex Storage
    for (const storageId of wardrobeStorageIds) {
      try {
        await ctx.storage.delete(storageId);
      } catch (err) {
        console.error("deleteAccount: failed to delete wardrobe storage file", { storageId, err });
      }
    }

    // Delete profile photo from Convex Storage
    if (profilePhotoStorageId) {
      try {
        await ctx.storage.delete(profilePhotoStorageId);
      } catch (err) {
        console.error("deleteAccount: failed to delete profile photo", { profilePhotoStorageId, err });
      }
    }

    // Delete all DB documents
    await ctx.runMutation(internal.users.deleteAllUserDocs, { userId: user._id });

    // Delete Clerk user via Clerk Backend API
    if (clerkId) {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (clerkSecretKey) {
        try {
          const res = await fetch(`https://api.clerk.com/v1/users/${clerkId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${clerkSecretKey}` },
          });
          if (!res.ok) {
            const body = await res.text();
            console.error("deleteAccount: Clerk deletion failed", {
              clerkId,
              status: res.status,
              body,
            });
          }
        } catch (err) {
          console.error("deleteAccount: Clerk API call failed", { clerkId, err });
        }
      } else {
        console.error("deleteAccount: CLERK_SECRET_KEY not set in Convex env — Clerk user not deleted");
      }
    }

    return { success: true };
  },
});

/** Return all user data as a JSON-serialisable object for download. */
export const exportData = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUserOptional(ctx);
    if (!user) return null;

    const [wardrobeItems, outfits, swipes, shoppingGaps] = await Promise.all([
      ctx.db.query("wardrobeItems").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("outfits").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("outfitSwipes").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("shoppingGaps").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, profilePhotoStorageId, ...profileRest } = user;

    return {
      profile: profileRest,
      wardrobeItems,
      outfits,
      swipes,
      shoppingGaps,
      exportedAt: new Date().toISOString(),
    };
  },
});
