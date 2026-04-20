/**
 * Seed mutations for local development.
 * Run from the Convex dashboard or CLI:
 *   npx convex run seed:insertTestUsers
 *   npx convex run seed:insertTestWardrobe --clerkId <id>
 *   npx convex run seed:insertKaggleWardrobe --clerkId <id>
 */
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

/** Insert 2 test users. Safe to call multiple times — skips existing clerkIds. */
export const insertTestUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const testUsers = [
      {
        clerkId: "test_user_alice",
        displayName: "Alice",
        dateOfBirth: "1995-06-15",
      },
      {
        clerkId: "test_user_bob",
        displayName: "Bob",
        dateOfBirth: "1990-03-22",
      },
    ];

    const inserted: string[] = [];

    for (const u of testUsers) {
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", u.clerkId))
        .unique();

      if (existing) continue;

      const id = await ctx.db.insert("users", {
        ...u,
        stylePreferences: [],
        fitPreferences: [],
        totalSwipes: 0,
        contextMode: "cold_start",
        shoppingCacheInvalid: false,
      });
      inserted.push(id);
    }

    return { inserted: inserted.length, skipped: testUsers.length - inserted.length };
  },
});

/**
 * Insert sample wardrobe items for a given clerkId.
 * Uses a sentinel storageId — images won't load, but schema/queries work locally.
 */
export const insertTestWardrobe = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error(`User not found for clerkId: ${clerkId}`);

    const items: Array<{
      name: string;
      category: "tops" | "bottoms" | "shoes" | "outerwear" | "accessories" | "dresses" | "bags";
      colours: string[];
      tags: string[];
      seasonTags: string[];
      dominantColourHex: string;
    }> = [
      {
        name: "White cotton t-shirt",
        category: "tops",
        colours: ["white"],
        tags: ["casual", "basic", "cotton"],
        seasonTags: ["spring", "summer"],
        dominantColourHex: "#FFFFFF",
      },
      {
        name: "Dark wash jeans",
        category: "bottoms",
        colours: ["navy", "dark blue"],
        tags: ["casual", "denim", "classic"],
        seasonTags: ["all"],
        dominantColourHex: "#1C2951",
      },
      {
        name: "White sneakers",
        category: "shoes",
        colours: ["white"],
        tags: ["casual", "sporty", "versatile"],
        seasonTags: ["spring", "summer", "autumn"],
        dominantColourHex: "#F5F5F5",
      },
      {
        name: "Black blazer",
        category: "outerwear",
        colours: ["black"],
        tags: ["smart", "work", "classic"],
        seasonTags: ["autumn", "winter", "spring"],
        dominantColourHex: "#1A1A1A",
      },
      {
        name: "Floral midi dress",
        category: "dresses",
        colours: ["pink", "green", "white"],
        tags: ["feminine", "casual", "summer"],
        seasonTags: ["spring", "summer"],
        dominantColourHex: "#F4A0B5",
      },
    ];

    const inserted: string[] = [];
    for (const item of items) {
      const id = await ctx.db.insert("wardrobeItems", {
        userId: user._id,
        imageUrl:
          "https://placehold.co/400x400/e2e8f0/94a3b8?text=" +
          encodeURIComponent(item.name),
        isActive: true,
        aiTaggedAt: Date.now(),
        ...item,
      });
      inserted.push(id);
    }

    return { userId: user._id, inserted: inserted.length };
  },
});

/**
 * Insert 250 real Kaggle fashion items for a given clerkId.
 * Items sourced from paramaggarwal/fashion-product-images-dataset (styles.csv).
 * Images use placehold.co placeholders — swap for real Convex Storage URLs in prod.
 * Safe to call multiple times — clears existing items first to avoid duplicates.
 */
export const insertKaggleWardrobe = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (!user) throw new Error(`User not found for clerkId: ${clerkId}`);

    // Clear existing wardrobe to avoid duplicates on re-run
    const existing = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const item of existing) {
      await ctx.db.delete(item._id);
    }

    const items: Array<{
      name: string;
      category: "tops" | "bottoms" | "shoes" | "outerwear" | "accessories" | "dresses" | "bags";
      colours: string[];
      tags: string[];
      seasonTags: string[];
      dominantColourHex: string;
    }> = [
      { name: "Scullers Men Check Blue Shirts", category: "tops" as const, colours: ["blue"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Scullers For Her Women Rivited Check Black Shirts", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Sepia Women Blue Printed Top", category: "tops" as const, colours: ["blue"], tags: ["casual", "everyday", "top"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "Do u speak green Men Cream T-shirt", category: "tops" as const, colours: ["off white"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#FAF9F6" },
      { name: "ADIDAS Mens Polo Black Polo T-shirt", category: "tops" as const, colours: ["black"], tags: ["sporty", "athletic", "gym", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Mark Taylor Men Striped Grey Shirt", category: "tops" as const, colours: ["grey"], tags: ["formal", "work", "office", "shirt", "button-up"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "Proline Men Red T-shirt", category: "tops" as const, colours: ["red"], tags: ["sporty", "athletic", "gym", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#DC2626" },
      { name: "Indigo Nation Men Striped Black & Blue T-shirt", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Myntra Women's I Know I Am Not Black T-shirt", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Basics Men Red Slim Fit Checked Shirt", category: "tops" as const, colours: ["red"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#DC2626" },
      { name: "Locomotive Men Lavender And Grey Check Shirt", category: "tops" as const, colours: ["maroon"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["spring", "summer"], dominantColourHex: "#7F1D1D" },
      { name: "Classic Polo Men Printed Navy Blue T-shirt", category: "tops" as const, colours: ["navy blue"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#1C2951" },
      { name: "Scullers Men Scul Red White Shirts", category: "tops" as const, colours: ["white"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFFFFF" },
      { name: "Indigo Nation Men Stripes Black Shirts", category: "tops" as const, colours: ["black"], tags: ["formal", "work", "office", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Levis Kids Boy's Caspian Black Kidswear", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Scullers For Her Women Scarf Shirt Black Tops", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Indigo Nation Men Red Polo T-shirt", category: "tops" as const, colours: ["red"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#DC2626" },
      { name: "Mother Earth Women Pink Kurta", category: "tops" as const, colours: ["pink"], tags: ["ethnic", "traditional", "kurta"], seasonTags: ["spring", "summer"], dominantColourHex: "#EC4899" },
      { name: "Tantra Kid's Unisex Meet My Daddy Red Kidswear", category: "tops" as const, colours: ["red"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#DC2626" },
      { name: "Sepia Women Printed Green Top", category: "tops" as const, colours: ["green"], tags: ["casual", "everyday", "top"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "Highlander Men Check Blue Shirt", category: "tops" as const, colours: ["blue"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Puma Men Hamburg Graphic Green T-shirt", category: "tops" as const, colours: ["green"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "U.S. Polo Assn. Men Solid Black Sweater", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "knit", "warm"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Indigo Nation Men Price catch Blue Shirts", category: "tops" as const, colours: ["blue"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Mumbai Slang Women Printed Green Top", category: "tops" as const, colours: ["green"], tags: ["casual", "everyday", "top"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "Indigo Nation Men Stripes Purple Shirts", category: "tops" as const, colours: ["purple"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#7C3AED" },
      { name: "Mark Taylor Men Grey White & Light Brown Striped Shirt", category: "tops" as const, colours: ["grey"], tags: ["formal", "work", "office", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#6B7280" },
      { name: "Proline Men Multicoloured Striped Polo T-shirt", category: "tops" as const, colours: ["brown"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#92400E" },
      { name: "Mother Earth Women Blue Kurta", category: "tops" as const, colours: ["blue"], tags: ["ethnic", "traditional", "kurta"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "Probase Men Punk Green Tshirts", category: "tops" as const, colours: ["green"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#16A34A" },
      { name: "Wrangler Women Native Lady Pink T-shirt", category: "tops" as const, colours: ["pink"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#EC4899" },
      { name: "Wills Lifestyle Women Cream Top", category: "tops" as const, colours: ["cream"], tags: ["casual", "everyday", "top"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFF8DC" },
      { name: "Myntra Men Blue Diet Extreme T-shirt", category: "tops" as const, colours: ["blue"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "Little Miss Women Giggles Black T-shirt", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Puma Men graphic story tee White Tshirts", category: "tops" as const, colours: ["white"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFFFFF" },
      { name: "Puma Men Generation Black Polo Tshirt", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Arrow Woman Yellow Top", category: "tops" as const, colours: ["yellow"], tags: ["casual", "everyday", "top"], seasonTags: ["spring", "summer"], dominantColourHex: "#EAB308" },
      { name: "Tokyo Talkies Women Printed Orange Top", category: "tops" as const, colours: ["orange"], tags: ["casual", "everyday", "top"], seasonTags: ["autumn", "winter"], dominantColourHex: "#F97316" },
      { name: "ADIDAS Men Aess Polo Navy Blue T-shirt", category: "tops" as const, colours: ["navy blue"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#1C2951" },
      { name: "Ed Hardy Men Printed Maroon Tshirts", category: "tops" as const, colours: ["red"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#DC2626" },
      { name: "Nike Women Trainng Grey Tops", category: "tops" as const, colours: ["grey"], tags: ["sporty", "athletic", "gym", "top", "casual"], seasonTags: ["autumn", "winter"], dominantColourHex: "#6B7280" },
      { name: "Nike Men Organic Red T-shirt", category: "tops" as const, colours: ["red"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#DC2626" },
      { name: "Lee Women Purple Paula Pansy Top", category: "tops" as const, colours: ["purple"], tags: ["casual", "everyday", "top"], seasonTags: ["spring", "summer"], dominantColourHex: "#7C3AED" },
      { name: "Probase Men's Screw U Green T-shirt", category: "tops" as const, colours: ["green"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "ADIDAS Women Graphic White T-shirt", category: "tops" as const, colours: ["white"], tags: ["sporty", "athletic", "gym", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFFFFF" },
      { name: "Indigo Nation Men Price catch Black White Shirts", category: "tops" as const, colours: ["white"], tags: ["formal", "work", "office", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFFFFF" },
      { name: "Indigo Nation Men Checks Blue Shirts", category: "tops" as const, colours: ["blue"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "United Colors of Benetton Women Stripes Pink Tops", category: "tops" as const, colours: ["pink"], tags: ["casual", "everyday", "top"], seasonTags: ["spring", "summer"], dominantColourHex: "#EC4899" },
      { name: "Puma Men's Record Grey T-shirt", category: "tops" as const, colours: ["grey"], tags: ["sporty", "athletic", "gym", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#6B7280" },
      { name: "Vishudh Women Blue Printed Kurta", category: "tops" as const, colours: ["blue"], tags: ["ethnic", "traditional", "kurta"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "Sushilas Women Printed Green Kurta", category: "tops" as const, colours: ["green"], tags: ["ethnic", "traditional", "kurta"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "Tonga Women Pink & White Top", category: "tops" as const, colours: ["pink"], tags: ["casual", "everyday", "top"], seasonTags: ["spring", "summer"], dominantColourHex: "#EC4899" },
      { name: "Indigo Nation Men Check White Shirt", category: "tops" as const, colours: ["white"], tags: ["formal", "work", "office", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFFFFF" },
      { name: "United Colors of Benetton Men Printed Black TShirt", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Turtle Men Check Red Shirt", category: "tops" as const, colours: ["red"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["spring", "summer"], dominantColourHex: "#DC2626" },
      { name: "ONLY Women Pink Top", category: "tops" as const, colours: ["pink"], tags: ["casual", "everyday", "top"], seasonTags: ["spring", "summer"], dominantColourHex: "#EC4899" },
      { name: "Inkfruit Men's Just bowl It Black T-shirt", category: "tops" as const, colours: ["black"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Belmonte Men Check Red Shirts", category: "tops" as const, colours: ["red"], tags: ["casual", "everyday", "shirt", "button-up"], seasonTags: ["autumn", "winter"], dominantColourHex: "#DC2626" },
      { name: "Mark Taylor Beige Printed T-shirt", category: "tops" as const, colours: ["beige"], tags: ["casual", "everyday", "t-shirt", "cotton"], seasonTags: ["autumn", "winter"], dominantColourHex: "#D4B483" },
      { name: "Shree Women Multicoloured Printed Kurta", category: "tops" as const, colours: ["multi"], tags: ["ethnic", "traditional", "kurta"], seasonTags: ["spring", "summer"], dominantColourHex: "#9E9E9E" },
      { name: "Kraus Jeans Women White Leggings", category: "bottoms" as const, colours: ["white"], tags: ["casual", "everyday", "leggings", "stretch"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFFFFF" },
      { name: "Flying Machine Men Blue Solid Regular Fit Denim Shorts", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "shorts"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "ADIDAS Men Black Track Pant", category: "bottoms" as const, colours: ["black"], tags: ["casual", "everyday", "tracksuit", "athletic"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Flying Machine Men Midrise Blue Jeans", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "s.Oliver Men Grey Checked Shorts", category: "bottoms" as const, colours: ["grey"], tags: ["casual", "everyday", "shorts"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "Arrow Men Navy Grey Trousers", category: "bottoms" as const, colours: ["grey"], tags: ["formal", "work", "office", "trousers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#6B7280" },
      { name: "ADIDAS Women Grey Track Pants", category: "bottoms" as const, colours: ["grey"], tags: ["sporty", "athletic", "gym", "tracksuit"], seasonTags: ["autumn", "winter"], dominantColourHex: "#6B7280" },
      { name: "Nike Men Solid Grey Shorts", category: "bottoms" as const, colours: ["grey"], tags: ["casual", "everyday", "shorts"], seasonTags: ["autumn", "winter"], dominantColourHex: "#6B7280" },
      { name: "Lee Men Black Chicago Fit Jeans", category: "bottoms" as const, colours: ["black"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Hanes Women Nude ComfortSoft Waistband Cotton Stretch Full Leggings", category: "bottoms" as const, colours: ["nude"], tags: ["casual", "everyday", "leggings", "stretch"], seasonTags: ["winter", "autumn"], dominantColourHex: "#9E9E9E" },
      { name: "John Miller Men Striped Grey Trousers", category: "bottoms" as const, colours: ["grey"], tags: ["formal", "work", "office", "trousers"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "Palm Tree Kids Boys Washed Blue Shorts", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "shorts"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Indigo Nation Men Solid Khaki Trousers", category: "bottoms" as const, colours: ["khaki"], tags: ["formal", "work", "office", "trousers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#C3B091" },
      { name: "Puma Women Black Core Track Pants", category: "bottoms" as const, colours: ["black"], tags: ["casual", "everyday", "tracksuit", "athletic"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Highlander Men Solid Beige Trouser", category: "bottoms" as const, colours: ["beige"], tags: ["casual", "everyday", "trousers", "formal"], seasonTags: ["autumn", "winter"], dominantColourHex: "#D4B483" },
      { name: "Deni Yo Men Blue Washed Slim Fit Jeans", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "Nike Men Crickt Blue Track Pants", category: "bottoms" as const, colours: ["blue"], tags: ["sporty", "athletic", "gym", "tracksuit"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Palm Tree Kids Boys Solid Beige Shorts", category: "bottoms" as const, colours: ["beige"], tags: ["casual", "everyday", "shorts"], seasonTags: ["autumn", "winter"], dominantColourHex: "#D4B483" },
      { name: "Pepe Jeans Men Grey 3/4 Length Pants", category: "bottoms" as const, colours: ["grey"], tags: ["casual", "everyday", "shorts"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "Nike Black Dri-fit Cotton     Cricket  Shorts", category: "bottoms" as const, colours: ["black"], tags: ["sporty", "athletic", "gym", "shorts"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Flying Machine Men Washed Blue Jeans", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["winter", "autumn"], dominantColourHex: "#2563EB" },
      { name: "Tribord Mens Grey Cargo Shorts", category: "bottoms" as const, colours: ["grey"], tags: ["casual", "everyday", "shorts"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "Locomotive Men Race Blue Jeans", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Scullers Men Check Grey Trousers", category: "bottoms" as const, colours: ["grey"], tags: ["casual", "everyday", "trousers", "formal"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "Locomotive Men Washed Blue Jeans", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "ADIDAS Men Adna Revpt Grey Trackpant", category: "bottoms" as const, colours: ["grey"], tags: ["sporty", "athletic", "gym", "tracksuit"], seasonTags: ["autumn", "winter"], dominantColourHex: "#6B7280" },
      { name: "Flying Machine Men Washed Blue Jeans", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["winter", "autumn"], dominantColourHex: "#2563EB" },
      { name: "Wrangler Women Blue Michelle Jeans", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Hanes Women Brown ComfortSoft Waistband Cotton Stretch Full Leggings", category: "bottoms" as const, colours: ["brown"], tags: ["casual", "everyday", "leggings", "stretch"], seasonTags: ["winter", "autumn"], dominantColourHex: "#92400E" },
      { name: "Forever New Women Blossom  Pink Printed Skirt", category: "bottoms" as const, colours: ["pink"], tags: ["casual", "everyday", "skirt"], seasonTags: ["autumn", "winter"], dominantColourHex: "#EC4899" },
      { name: "Proline Men Navy Tracksuit", category: "bottoms" as const, colours: ["navy blue"], tags: ["sporty", "athletic", "gym", "tracksuit"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1C2951" },
      { name: "Locomotive Men Cael Blue Jeans", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Nike Women Jersey Cuffed Black Capris", category: "bottoms" as const, colours: ["black"], tags: ["sporty", "athletic", "gym", "capris", "casual"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "John Miller Men Black Trousers", category: "bottoms" as const, colours: ["black"], tags: ["formal", "work", "office", "trousers"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Lee Women Black Jeans", category: "bottoms" as const, colours: ["black"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Jealous 21 Women Brown Jeggings", category: "bottoms" as const, colours: ["brown"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["autumn", "winter"], dominantColourHex: "#92400E" },
      { name: "Proline Men Grey Tracksuit", category: "bottoms" as const, colours: ["grey"], tags: ["sporty", "athletic", "gym", "tracksuit"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "Spykar Men Blue Jeans", category: "bottoms" as const, colours: ["blue"], tags: ["casual", "everyday", "denim", "jeans"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "Scullers Men Scul Green Trousers", category: "bottoms" as const, colours: ["green"], tags: ["formal", "work", "office", "trousers"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "Nike Men White Shorts", category: "bottoms" as const, colours: ["white"], tags: ["sporty", "athletic", "gym", "shorts"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "Nike Women Lunarfly Grey Green Shoe", category: "shoes" as const, colours: ["grey"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "Nike Men Lunarglide Black Sports Shoes", category: "shoes" as const, colours: ["black"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Nike Women Alphaballer  Black Casual Shoes", category: "shoes" as const, colours: ["black"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Lee Cooper Men Casual Black Shoes", category: "shoes" as const, colours: ["black"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Numero Uno Men White Casual Shoes", category: "shoes" as const, colours: ["white"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFFFFF" },
      { name: "Carlton London Women Black Heels", category: "shoes" as const, colours: ["black"], tags: ["casual", "everyday", "heels", "dressy"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Rocia Women Silver Flats", category: "shoes" as const, colours: ["silver"], tags: ["casual", "everyday", "heels", "dressy"], seasonTags: ["winter", "autumn"], dominantColourHex: "#C0C0C0" },
      { name: "Kalenji Men's Kapteren Black Shoe", category: "shoes" as const, colours: ["black"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Carlton London Women Red Shoes", category: "shoes" as const, colours: ["red"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#DC2626" },
      { name: "Timberland Men Black Casual Shoes", category: "shoes" as const, colours: ["black"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Catwalk Women Casual Bronze Heels", category: "shoes" as const, colours: ["bronze"], tags: ["casual", "everyday", "heels", "dressy"], seasonTags: ["winter", "autumn"], dominantColourHex: "#CD7F32" },
      { name: "ADIDAS Women's Daily White Shoe", category: "shoes" as const, colours: ["white"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "Spinn Men Viking White Casual Shoes", category: "shoes" as const, colours: ["white"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "Converse Men Navy Casual Shoes", category: "shoes" as const, colours: ["navy blue"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#1C2951" },
      { name: "Gas Men Eldorado Sandal", category: "shoes" as const, colours: ["brown"], tags: ["casual", "everyday", "sandals", "open-toe"], seasonTags: ["spring", "summer"], dominantColourHex: "#92400E" },
      { name: "ADIDAS Women Caroni Black Flip Flop", category: "shoes" as const, colours: ["black"], tags: ["casual", "everyday", "flip-flops"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Timberland Women Chauncy ox  Casual Shoe", category: "shoes" as const, colours: ["brown"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#92400E" },
      { name: "ADIDAS Men Olive Shoes", category: "shoes" as const, colours: ["olive"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#808000" },
      { name: "Crocs Men Santa Cruz Clog Espresso Brown Sandal", category: "shoes" as const, colours: ["brown"], tags: ["casual", "everyday", "sandals", "open-toe"], seasonTags: ["spring", "summer"], dominantColourHex: "#92400E" },
      { name: "Nike Men T90 Shoot IV Hg-B Blue Sports Shoes", category: "shoes" as const, colours: ["blue"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "ADIDAS Women White Flip Flops", category: "shoes" as const, colours: ["white"], tags: ["casual", "everyday", "flip-flops"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "Nike Men Air Force 1 '07 White Sports Shoes", category: "shoes" as const, colours: ["white"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "ADIDAS Men's Jawpaw Black Metal Shoe", category: "shoes" as const, colours: ["black"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Newfeel Unisex Green Sports Shoes", category: "shoes" as const, colours: ["green"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#16A34A" },
      { name: "Senorita Women Maroon Sandals", category: "shoes" as const, colours: ["maroon"], tags: ["casual", "everyday", "heels", "dressy"], seasonTags: ["spring", "summer"], dominantColourHex: "#7F1D1D" },
      { name: "ADIDAS Men White Corona Sports Shoes", category: "shoes" as const, colours: ["white"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "Enroute Women Casual Navy Flats", category: "shoes" as const, colours: ["navy blue"], tags: ["casual", "everyday", "heels", "dressy"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1C2951" },
      { name: "Woodland Men Green Casual Shoes", category: "shoes" as const, colours: ["green"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "Kalenji Kiprun 1000 Whi/ Blue 2011", category: "shoes" as const, colours: ["white"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFFFFF" },
      { name: "United Colors of Benetton Men Blue Shoes", category: "shoes" as const, colours: ["blue"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "ADIDAS Men Black Adipure Sports Shoes", category: "shoes" as const, colours: ["black"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Catwalk Women Olive Wedges", category: "shoes" as const, colours: ["olive"], tags: ["casual", "everyday", "heels", "dressy"], seasonTags: ["spring", "summer"], dominantColourHex: "#808000" },
      { name: "Woodland Men Khaki Casual Shoes", category: "shoes" as const, colours: ["khaki"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#C3B091" },
      { name: "Disney Unisex Kids Mickey Star Red Flip Flops", category: "shoes" as const, colours: ["red"], tags: ["casual", "everyday", "flip-flops"], seasonTags: ["winter", "autumn"], dominantColourHex: "#DC2626" },
      { name: "Rocia Women Brown Wedges", category: "shoes" as const, colours: ["brown"], tags: ["casual", "everyday", "heels", "dressy"], seasonTags: ["winter", "autumn"], dominantColourHex: "#92400E" },
      { name: "Converse Unisex Casual Green Slipper", category: "shoes" as const, colours: ["green"], tags: ["casual", "everyday", "flip-flops"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "Puma Women Roque Grey Sandals", category: "shoes" as const, colours: ["grey"], tags: ["casual", "everyday", "flats", "comfortable"], seasonTags: ["autumn", "winter"], dominantColourHex: "#6B7280" },
      { name: "Timberland Women Petits Purple Casual Shoes", category: "shoes" as const, colours: ["purple"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#7C3AED" },
      { name: "HM Women Black Shoes", category: "shoes" as const, colours: ["black"], tags: ["casual", "everyday", "flats", "comfortable"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Crocs Kids Red Flip-Flops", category: "shoes" as const, colours: ["red"], tags: ["casual", "everyday", "flip-flops"], seasonTags: ["autumn", "winter"], dominantColourHex: "#DC2626" },
      { name: "Carlton London Men Black Formal Shoes", category: "shoes" as const, colours: ["black"], tags: ["formal", "work", "office", "leather"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Rocia Women Brown Sandals", category: "shoes" as const, colours: ["brown"], tags: ["casual", "everyday", "heels", "dressy"], seasonTags: ["winter", "autumn"], dominantColourHex: "#92400E" },
      { name: "Rockport Men Brown Cashaw Camel Suede Casual Shoes", category: "shoes" as const, colours: ["brown"], tags: ["casual", "everyday", "sneakers"], seasonTags: ["autumn", "winter"], dominantColourHex: "#92400E" },
      { name: "Nike Men's Air Pegasus 27 White Grey Shoe", category: "shoes" as const, colours: ["white"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "ASICS Men Gel Enduro 7 Running Silver Sports Shoes", category: "shoes" as const, colours: ["grey"], tags: ["sporty", "athletic", "gym", "sneakers"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "ADIDAS Men Solid White Jackets", category: "outerwear" as const, colours: ["white"], tags: ["sporty", "athletic", "gym", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFFFFF" },
      { name: "ONLY Women Blue Jacket", category: "outerwear" as const, colours: ["blue"], tags: ["casual", "everyday", "jacket", "layering"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "Nike Men As Sideline J Black Jackets", category: "outerwear" as const, colours: ["black"], tags: ["sporty", "athletic", "gym", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Nike Men As Sideline J Blue Jackets", category: "outerwear" as const, colours: ["blue"], tags: ["sporty", "athletic", "gym", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Wildcraft Men Blue Rain Jacket", category: "outerwear" as const, colours: ["blue"], tags: ["casual", "everyday", "waterproof", "outerwear"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "United Colors of Benetton Women Solid Black Jacket", category: "outerwear" as const, colours: ["black"], tags: ["casual", "everyday", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "U.S. Polo Assn. Men Solid Olive Jacket", category: "outerwear" as const, colours: ["olive"], tags: ["casual", "everyday", "jacket", "layering"], seasonTags: ["winter", "autumn"], dominantColourHex: "#808000" },
      { name: "Elle Women Black Jacket", category: "outerwear" as const, colours: ["black"], tags: ["casual", "everyday", "jacket", "layering"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Nike Men Windrunner Blue Jacket", category: "outerwear" as const, colours: ["blue"], tags: ["sporty", "athletic", "gym", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "ADIDAS Men Navy Blue Jacket", category: "outerwear" as const, colours: ["navy blue"], tags: ["casual", "everyday", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1C2951" },
      { name: "Turtle Solid Men Grey Jacket", category: "outerwear" as const, colours: ["grey"], tags: ["casual", "everyday", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#6B7280" },
      { name: "Forever New Women Washed Blue Jacket", category: "outerwear" as const, colours: ["blue"], tags: ["casual", "everyday", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Nike Women Solid Blue Jackets", category: "outerwear" as const, colours: ["blue"], tags: ["sporty", "athletic", "gym", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Urban Yoga Women Solid Pink Jacket", category: "outerwear" as const, colours: ["pink"], tags: ["casual", "everyday", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#EC4899" },
      { name: "C Vox Women Solid 1354 Black Jacket", category: "outerwear" as const, colours: ["black"], tags: ["casual", "everyday", "jacket", "layering"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Jealous 21 Women Black Dress", category: "dresses" as const, colours: ["black"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Forever New Women Cream Fur Dress", category: "dresses" as const, colours: ["cream"], tags: ["casual", "everyday", "dress"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFF8DC" },
      { name: "French Connection Red & Brown Dress", category: "dresses" as const, colours: ["red"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#DC2626" },
      { name: "Avirate Brown & Grey Check Dress", category: "dresses" as const, colours: ["brown"], tags: ["casual", "everyday", "dress"], seasonTags: ["autumn", "winter"], dominantColourHex: "#92400E" },
      { name: "Avirate Black Dress", category: "dresses" as const, colours: ["black"], tags: ["casual", "everyday", "dress"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Tonga Women Brown Dress", category: "dresses" as const, colours: ["brown"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#92400E" },
      { name: "French Connection Women Navy Blue Striped Dress", category: "dresses" as const, colours: ["white"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "Femella Women Black Lace Dress", category: "dresses" as const, colours: ["black"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Tonga Women Olive Dress", category: "dresses" as const, colours: ["olive"], tags: ["casual", "everyday", "dress"], seasonTags: ["autumn", "winter"], dominantColourHex: "#808000" },
      { name: "Latin Quarters Women Pink Printed Dress", category: "dresses" as const, colours: ["pink"], tags: ["casual", "everyday", "dress"], seasonTags: ["autumn", "winter"], dominantColourHex: "#EC4899" },
      { name: "Mineral Cream Dress", category: "dresses" as const, colours: ["cream"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFF8DC" },
      { name: "Elle Women Multi Coloured Dress", category: "dresses" as const, colours: ["multi"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#9E9E9E" },
      { name: "French Connection Black Dress", category: "dresses" as const, colours: ["black"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Avirate Mushroom Brown Dress", category: "dresses" as const, colours: ["black"], tags: ["casual", "everyday", "dress"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "AND Women Pink Dress", category: "dresses" as const, colours: ["pink"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#EC4899" },
      { name: "Elle Black Dress", category: "dresses" as const, colours: ["black"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Latin Quarters Women Brown Printed Dress", category: "dresses" as const, colours: ["brown"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#92400E" },
      { name: "Latin Quarters Women Grey & Olive Printed Dress", category: "dresses" as const, colours: ["grey"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#6B7280" },
      { name: "Forever New Women Straps Black Dress", category: "dresses" as const, colours: ["black"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Latin Quarters Women White & Pink Printed Dress", category: "dresses" as const, colours: ["white"], tags: ["casual", "everyday", "dress"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "Adrika Pink Earrings", category: "accessories" as const, colours: ["pink"], tags: ["casual", "everyday", "earrings", "jewellery"], seasonTags: ["spring", "summer"], dominantColourHex: "#EC4899" },
      { name: "Rreverie Silver Earrings", category: "accessories" as const, colours: ["silver"], tags: ["casual", "everyday", "earrings", "jewellery"], seasonTags: ["autumn", "winter"], dominantColourHex: "#C0C0C0" },
      { name: "Cat Men Sheet Sunglasses", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Guess Men Boulevard Silver Watch", category: "accessories" as const, colours: ["silver"], tags: ["casual", "everyday", "watch", "accessory"], seasonTags: ["winter", "autumn"], dominantColourHex: "#C0C0C0" },
      { name: "Pitaraa Golden Nugget Long Necklace", category: "accessories" as const, colours: ["gold"], tags: ["casual", "everyday", "necklace", "jewellery"], seasonTags: ["autumn", "winter"], dominantColourHex: "#FFD700" },
      { name: "Royal Diadem Green Earrings", category: "accessories" as const, colours: ["green"], tags: ["ethnic", "traditional", "earrings", "jewellery"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "Pieces Women Yellow Canvas Belt", category: "accessories" as const, colours: ["yellow"], tags: ["casual", "everyday", "belt", "leather"], seasonTags: ["spring", "summer"], dominantColourHex: "#EAB308" },
      { name: "Q&Q Women Red Dial Watch GS97J322Y", category: "accessories" as const, colours: ["red"], tags: ["casual", "everyday", "watch", "accessory"], seasonTags: ["winter", "autumn"], dominantColourHex: "#DC2626" },
      { name: "Q&Q Men Black Dial Watch", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "watch", "accessory"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Maxima Men Silver Dial Watch", category: "accessories" as const, colours: ["silver"], tags: ["casual", "everyday", "watch", "accessory"], seasonTags: ["winter", "autumn"], dominantColourHex: "#C0C0C0" },
      { name: "Wills Lifestyle Men Leather Black Belt", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "belt", "leather"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Femella Women Printed Blue Scarf", category: "accessories" as const, colours: ["blue"], tags: ["casual", "everyday", "scarf", "layering"], seasonTags: ["spring", "summer"], dominantColourHex: "#2563EB" },
      { name: "Van Heusen Women Aviator Sunglasses", category: "accessories" as const, colours: ["grey"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#6B7280" },
      { name: "French Connection Women Black Wallet", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "wallet"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Baggit Women Olive Wallet", category: "accessories" as const, colours: ["olive"], tags: ["casual", "everyday", "wallet"], seasonTags: ["spring", "summer"], dominantColourHex: "#808000" },
      { name: "Fossil Men Brown Justin Belt", category: "accessories" as const, colours: ["brown"], tags: ["casual", "everyday", "belt", "leather"], seasonTags: ["spring", "summer"], dominantColourHex: "#92400E" },
      { name: "Royal Diadem Purple Earrings", category: "accessories" as const, colours: ["purple"], tags: ["casual", "everyday", "earrings", "jewellery"], seasonTags: ["spring", "summer"], dominantColourHex: "#7C3AED" },
      { name: "Timex Men Blue Dial Watch", category: "accessories" as const, colours: ["blue"], tags: ["formal", "work", "office", "watch", "accessory"], seasonTags: ["winter", "autumn"], dominantColourHex: "#2563EB" },
      { name: "Baggit Women Charmy Moly Red Belt", category: "accessories" as const, colours: ["red"], tags: ["casual", "everyday", "belt", "leather"], seasonTags: ["spring", "summer"], dominantColourHex: "#DC2626" },
      { name: "Fastrack Men Black Dial Watch", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "watch", "accessory"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Lino Perros Men Wallet", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "wallet"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Flying Machine Men Black Belt", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "belt", "leather"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Ivory Tag Women Tangled Coral Red Necklace", category: "accessories" as const, colours: ["red"], tags: ["casual", "everyday", "necklace", "jewellery"], seasonTags: ["autumn", "winter"], dominantColourHex: "#DC2626" },
      { name: "Fossil Men Brown Wallet", category: "accessories" as const, colours: ["brown"], tags: ["casual", "everyday", "wallet"], seasonTags: ["winter", "autumn"], dominantColourHex: "#92400E" },
      { name: "Ray-Ban Unisex High Street Purple Sunglasses", category: "accessories" as const, colours: ["purple"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#7C3AED" },
      { name: "Louis Philippe Men Aviator Sunglasses LP217-C1", category: "accessories" as const, colours: ["grey"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#6B7280" },
      { name: "Ray-Ban Men Predator 2 Sunglasses", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Lee Men Tripack Socks", category: "accessories" as const, colours: ["white"], tags: ["casual", "everyday", "socks"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "Parx Men Black Belt", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "belt", "leather"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Raymond Men Black Socks", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "socks"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Lino Perros Men Navy Blue Wallet", category: "accessories" as const, colours: ["navy blue"], tags: ["casual", "everyday", "wallet"], seasonTags: ["spring", "summer"], dominantColourHex: "#1C2951" },
      { name: "Estelle Women Green Bracelet", category: "accessories" as const, colours: ["green"], tags: ["casual", "everyday", "bracelet", "jewellery"], seasonTags: ["winter", "autumn"], dominantColourHex: "#16A34A" },
      { name: "Van Heusen Unisex Sunglasses VH220-C3", category: "accessories" as const, colours: ["grey"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#6B7280" },
      { name: "Image Men Sunglasses", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Femella Women Yellow & Grey Scarf", category: "accessories" as const, colours: ["yellow"], tags: ["casual", "everyday", "scarf", "layering"], seasonTags: ["spring", "summer"], dominantColourHex: "#EAB308" },
      { name: "Van Heusen Unisex Sunglasses VH214-C2", category: "accessories" as const, colours: ["brown"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#92400E" },
      { name: "Hidekraft Men Black Wallet", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "wallet"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Idee Men Black Sunglasses", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Playboy Men Orange & Black Socks", category: "accessories" as const, colours: ["orange"], tags: ["casual", "everyday", "socks"], seasonTags: ["spring", "summer"], dominantColourHex: "#F97316" },
      { name: "Revv Men Steel Bangle", category: "accessories" as const, colours: ["steel"], tags: ["casual", "everyday", "bangle", "jewellery"], seasonTags: ["spring", "summer"], dominantColourHex: "#C0C0C0" },
      { name: "Fossil Women Multi coloured Wallet", category: "accessories" as const, colours: ["cream"], tags: ["casual", "everyday", "wallet"], seasonTags: ["winter", "autumn"], dominantColourHex: "#FFF8DC" },
      { name: "Fastrack Unisex Brown Sunglasses", category: "accessories" as const, colours: ["brown"], tags: ["casual", "everyday", "sunglasses", "UV-protection"], seasonTags: ["winter", "autumn"], dominantColourHex: "#92400E" },
      { name: "Q&Q Men Black Digital Watch M119J003Y", category: "accessories" as const, colours: ["black"], tags: ["casual", "everyday", "watch", "accessory"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Fastrack Women Brown Belt", category: "accessories" as const, colours: ["brown"], tags: ["casual", "everyday", "belt", "leather"], seasonTags: ["winter", "autumn"], dominantColourHex: "#92400E" },
      { name: "Van Heusen Men Brown Wallet", category: "accessories" as const, colours: ["brown"], tags: ["formal", "work", "office", "wallet"], seasonTags: ["spring", "summer"], dominantColourHex: "#92400E" },
      { name: "Lino Perros Women Olive Handbag", category: "bags" as const, colours: ["olive"], tags: ["casual", "everyday", "handbag", "tote"], seasonTags: ["spring", "summer"], dominantColourHex: "#808000" },
      { name: "Nike Soleday Black Backpack", category: "bags" as const, colours: ["black"], tags: ["sporty", "athletic", "gym", "backpack"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Fastrack Unisex Black Red Printed Sling Bag", category: "bags" as const, colours: ["black"], tags: ["casual", "everyday", "backpack", "sporty"], seasonTags: ["autumn", "winter"], dominantColourHex: "#1A1A1A" },
      { name: "Bulchee Women Green Handbag", category: "bags" as const, colours: ["green"], tags: ["casual", "everyday", "handbag", "tote"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "Cabarelli Men Black Duffle Bag", category: "bags" as const, colours: ["black"], tags: ["casual", "everyday", "duffle", "sports"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Baggit Women Green Handbag", category: "bags" as const, colours: ["green"], tags: ["casual", "everyday", "handbag", "tote"], seasonTags: ["spring", "summer"], dominantColourHex: "#16A34A" },
      { name: "Kiara Women Blue Handbag", category: "bags" as const, colours: ["blue"], tags: ["casual", "everyday", "handbag", "tote"], seasonTags: ["winter", "autumn"], dominantColourHex: "#2563EB" },
      { name: "Envirosax Women Red Bag", category: "bags" as const, colours: ["red"], tags: ["casual", "everyday", "handbag", "tote"], seasonTags: ["spring", "summer"], dominantColourHex: "#DC2626" },
      { name: "Murcia Women Casual Blue Handbag", category: "bags" as const, colours: ["blue"], tags: ["casual", "everyday", "handbag", "tote"], seasonTags: ["winter", "autumn"], dominantColourHex: "#2563EB" },
      { name: "Wildcraft Unisex Red Backpack", category: "bags" as const, colours: ["red"], tags: ["casual", "everyday", "backpack", "sporty"], seasonTags: ["winter", "autumn"], dominantColourHex: "#DC2626" },
      { name: "Peter England Unisex Black Bag", category: "bags" as const, colours: ["black"], tags: ["casual", "everyday", "laptop-bag", "work"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Wildcraft Unisex Black Backpack", category: "bags" as const, colours: ["black"], tags: ["casual", "everyday", "backpack", "sporty"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "American Tourister Unisex Speedair Black Laptop Bag", category: "bags" as const, colours: ["black"], tags: ["casual", "everyday", "laptop-bag", "work"], seasonTags: ["winter", "autumn"], dominantColourHex: "#1A1A1A" },
      { name: "Domyos 300 Blue Bag", category: "bags" as const, colours: ["blue"], tags: ["sporty", "athletic", "gym", "backpack"], seasonTags: ["autumn", "winter"], dominantColourHex: "#2563EB" },
      { name: "Nike Unisex White Pink Black Check Backpack", category: "bags" as const, colours: ["white"], tags: ["sporty", "athletic", "gym", "backpack"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFFFFF" },
      { name: "United Colors of Benetton Men Black Backpack", category: "bags" as const, colours: ["black"], tags: ["casual", "everyday", "backpack", "sporty"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Wilson Unisex Red Champ Backpack", category: "bags" as const, colours: ["red"], tags: ["casual", "everyday", "backpack", "sporty"], seasonTags: ["spring", "summer"], dominantColourHex: "#DC2626" },
      { name: "Wildcraft Unisex Blue Duffle Bag", category: "bags" as const, colours: ["blue"], tags: ["casual", "everyday", "duffle", "sports"], seasonTags: ["winter", "autumn"], dominantColourHex: "#2563EB" },
      { name: "Lino Perros Women Pink Handbag", category: "bags" as const, colours: ["pink"], tags: ["casual", "everyday", "handbag", "tote"], seasonTags: ["spring", "summer"], dominantColourHex: "#EC4899" },
      { name: "Lino Perros Women Solid Camel Handbag", category: "bags" as const, colours: ["beige"], tags: ["casual", "everyday", "handbag", "tote"], seasonTags: ["winter", "autumn"], dominantColourHex: "#D4B483" },
      { name: "Baggit Women Black Bunny Rosy Purse", category: "bags" as const, colours: ["black"], tags: ["casual", "everyday", "clutch", "evening"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "OTLS Unisex Beige Backpack", category: "bags" as const, colours: ["beige"], tags: ["casual", "everyday", "backpack", "sporty"], seasonTags: ["spring", "summer"], dominantColourHex: "#D4B483" },
      { name: "Murcia Women Zoe Brown Handbags", category: "bags" as const, colours: ["brown"], tags: ["casual", "everyday", "handbag", "tote"], seasonTags: ["winter", "autumn"], dominantColourHex: "#92400E" },
      { name: "Nike Unisex Nike Black sling Duffle Bags", category: "bags" as const, colours: ["black"], tags: ["casual", "everyday", "duffle", "sports"], seasonTags: ["spring", "summer"], dominantColourHex: "#1A1A1A" },
      { name: "Baggit Women Golden Purse", category: "bags" as const, colours: ["gold"], tags: ["casual", "everyday", "clutch", "evening"], seasonTags: ["spring", "summer"], dominantColourHex: "#FFD700" },
    ];

    const inserted: string[] = [];
    for (const item of items) {
      const id = await ctx.db.insert("wardrobeItems", {
        userId: user._id,
        imageUrl:
          "https://placehold.co/400x400/e2e8f0/94a3b8?text=" +
          encodeURIComponent(item.name),
        isActive: true,
        aiTaggedAt: Date.now(),
        ...item,
      });
      inserted.push(id);
    }

    // Mark shopping cache stale so Shopping tab regenerates
    await ctx.db.patch(user._id, { shoppingCacheInvalid: true });

    return { userId: user._id, inserted: inserted.length };
  },
});

/**
 * Reassign all wardrobeItems from one clerkId to another.
 * Use this when seed was run with the wrong clerkId.
 * Example:
 *   npx convex run seed:reassignWardrobe --fromClerkId "old_id" --toClerkId "new_id"
 */
export const reassignWardrobe = internalMutation({
  args: { fromClerkId: v.string(), toClerkId: v.string() },
  handler: async (ctx, { fromClerkId, toClerkId }) => {
    const fromUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", fromClerkId))
      .unique();
    if (!fromUser) throw new Error(`No user found with clerkId: ${fromClerkId}`);

    const toUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", toClerkId))
      .unique();
    if (!toUser) throw new Error(`No user found with clerkId: ${toClerkId}`);

    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user_active", (q) => q.eq("userId", fromUser._id))
      .collect();

    for (const item of items) {
      await ctx.db.patch(item._id, { userId: toUser._id });
    }

    await ctx.db.patch(toUser._id, { shoppingCacheInvalid: true });

    return { reassigned: items.length, fromUserId: fromUser._id, toUserId: toUser._id };
  },
});

/** Delete all wardrobeItems for a clerkId. Run before re-seeding. */
export const clearWardrobe = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error(`No user for clerkId: ${clerkId}`);
    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const item of items) await ctx.db.delete(item._id);
    return { deleted: items.length };
  },
});

/** Return all wardrobeItems for a clerkId — used by uploadKaggleImages script. */
export const listItemsForUpload = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error(`No user for clerkId: ${clerkId}`);
    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return items.map((i) => ({ _id: i._id, name: i.name }));
  },
});

/** Generate a Convex Storage upload URL — used by uploadKaggleImages script. */
export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

/**
 * Insert a single saved outfit for a user — requires the user to have
 * wardrobe items already seeded (e.g. via insertTestWardrobe or resetTestUser with seedWardrobe).
 */
export const insertSavedOutfit = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error(`User not found for clerkId: ${clerkId}`);

    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user_active", (q) => q.eq("userId", user._id).eq("isActive", true))
      .take(4);

    if (items.length < 2) {
      throw new Error("User needs at least 2 active wardrobe items to seed a saved outfit");
    }

    const outfitId = await ctx.db.insert("outfits", {
      userId: user._id,
      itemIds: items.map((i) => i._id),
      heroItemId: items[0]._id,
      occasion: "Casual",
      season: "spring",
      reasoning: "A casual test outfit seeded for E2E testing.",
      styleTags: ["casual", "relaxed"],
      colourPalette: items.slice(0, 2).map((i) => i.dominantColourHex),
      isSaved: true,
      wornOn: [],
      batchId: "seed-test-batch",
    });

    return { outfitId };
  },
});

/** Patch storageId + imageUrl on a wardrobeItem after upload. */
export const patchImageUrl = internalMutation({
  args: {
    itemId: v.id("wardrobeItems"),
    storageId: v.id("_storage"),
    imageUrl: v.string(),
  },
  handler: async (ctx, { itemId, storageId, imageUrl }) => {
    await ctx.db.patch(itemId, { storageId, imageUrl });
  },
});

/**
 * Reset a test user to a clean state. Used by E2E tests.
 * - Sets totalSwipes and shoppingCacheInvalid to specified values
 * - Soft-deletes all active wardrobe items
 * - Deletes all shopping gaps
 * - Optionally seeds the wardrobe and test shopping gaps
 */
export const resetTestUser = internalMutation({
  args: {
    clerkId: v.string(),
    totalSwipes: v.optional(v.number()),
    shoppingCacheInvalid: v.optional(v.boolean()),
    seedWardrobe: v.optional(v.boolean()),
    seedGaps: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    {
      clerkId,
      totalSwipes = 0,
      shoppingCacheInvalid = false,
      seedWardrobe = false,
      seedGaps = false,
    }
  ) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error(`User not found for clerkId: ${clerkId}`);

    // Reset user counters
    await ctx.db.patch(user._id, {
      totalSwipes,
      shoppingCacheInvalid,
      contextMode: totalSwipes >= 20 ? "auto_detect" : "cold_start",
      likedCount: 0,
    });

    // Soft-delete all active wardrobe items
    const activeItems = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user_active", (q) => q.eq("userId", user._id).eq("isActive", true))
      .collect();
    for (const item of activeItems) {
      await ctx.db.patch(item._id, { isActive: false });
    }

    // Delete all outfits (including saved ones)
    const outfits = await ctx.db
      .query("outfits")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const outfit of outfits) {
      await ctx.db.delete(outfit._id);
    }

    // Delete all shopping gaps
    const gaps = await ctx.db
      .query("shoppingGaps")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const gap of gaps) {
      await ctx.db.delete(gap._id);
    }

    let wardrobeItemIds: string[] = [];

    // Optionally seed wardrobe
    if (seedWardrobe) {
      const testItems: Array<{
        name: string;
        category:
          | "tops"
          | "bottoms"
          | "shoes"
          | "outerwear"
          | "accessories"
          | "dresses"
          | "bags";
        colours: string[];
        tags: string[];
        seasonTags: string[];
        dominantColourHex: string;
      }> = [
        {
          name: "White cotton t-shirt",
          category: "tops",
          colours: ["white"],
          tags: ["casual", "basic"],
          seasonTags: ["all-season"],
          dominantColourHex: "#FFFFFF",
        },
        {
          name: "Dark wash jeans",
          category: "bottoms",
          colours: ["navy"],
          tags: ["casual", "denim"],
          seasonTags: ["all-season"],
          dominantColourHex: "#1C2951",
        },
        {
          name: "White sneakers",
          category: "shoes",
          colours: ["white"],
          tags: ["casual", "sporty"],
          seasonTags: ["all-season"],
          dominantColourHex: "#F5F5F5",
        },
        {
          name: "Black leather jacket",
          category: "outerwear",
          colours: ["black"],
          tags: ["casual", "edgy"],
          seasonTags: ["all-season"],
          dominantColourHex: "#1A1A1A",
        },
      ];

      for (const item of testItems) {
        // Use a sentinel imageUrl and no storageId for test items
        const id = await ctx.db.insert("wardrobeItems", {
          userId: user._id,
          imageUrl: "https://placehold.co/400x500/e2e8f0/94a3b8?text=Test",
          isActive: true,
          aiTaggedAt: Date.now(),
          ...item,
        });
        wardrobeItemIds.push(id);
      }
    }

    // Optionally seed test shopping gaps
    if (seedGaps) {
      const compatibleIds = wardrobeItemIds.slice(0, 2) as Id<"wardrobeItems">[];

      const testGaps: Array<{
        itemName: string;
        reason: string;
        priority: "high" | "medium" | "low";
        affectedOccasions: string[];
        compatibleItemIds: Id<"wardrobeItems">[];
        searchQuery: string;
        seasonRelevance: "current" | "upcoming" | "off-season";
      }> = [
        {
          itemName: "Navy chino trousers",
          reason: "You have no smart-casual bottoms for work occasions.",
          priority: "high",
          affectedOccasions: ["Work", "Smart casual"],
          compatibleItemIds: compatibleIds,
          searchQuery: "navy chino trousers slim fit",
          seasonRelevance: "current",
        },
        {
          itemName: "White button-down shirt",
          reason: "A versatile shirt would unlock formal and work outfits.",
          priority: "medium",
          affectedOccasions: ["Work", "Date night"],
          compatibleItemIds: compatibleIds,
          searchQuery: "white button down shirt men",
          seasonRelevance: "current",
        },
        {
          itemName: "Chelsea boots",
          reason: "Smart footwear is missing from your wardrobe.",
          priority: "high",
          affectedOccasions: ["Work", "Date night", "Smart casual"],
          compatibleItemIds: compatibleIds,
          searchQuery: "black chelsea boots leather",
          seasonRelevance: "current",
        },
        {
          itemName: "Winter puffer jacket",
          reason: "No warm outerwear for cold months.",
          priority: "medium",
          affectedOccasions: ["Casual", "Work"],
          compatibleItemIds: compatibleIds,
          searchQuery: "puffer jacket winter warm",
          seasonRelevance: "off-season",
        },
      ];

      for (const gap of testGaps) {
        await ctx.db.insert("shoppingGaps", {
          userId: user._id,
          ...gap,
        });
      }
    }

    return {
      reset: true,
      wardrobeItemsCleared: activeItems.length,
      gapsCleared: gaps.length,
      wardrobeItemsSeeded: wardrobeItemIds.length,
      gapsSeeded: seedGaps ? 4 : 0,
    };
  },
});
