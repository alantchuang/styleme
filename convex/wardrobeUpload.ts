"use node";
import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import {
  validateMimeType,
  validateFileSize,
  MAX_ACTIVE_ITEMS,
  parseTaggingResponse,
  validateAndNormalise,
} from "../lib/wardrobeValidation";

// PROMPT_VERSION: wardrobe_tagging_v4
const WARDROBE_TAGGING_SYSTEM = `You are a professional fashion analyst and wardrobe assistant.
Analyse clothing item photographs and return accurate, consistent metadata.

Rules:
- Return valid JSON matching the exact schema below. No markdown fences.
- Colours: common descriptive names (navy, cream, camel) — not hex codes.
- Tags: style descriptors useful for outfit pairing.
- category must be exactly one of:
  tops, bottoms, shoes, outerwear, accessories, dresses, bags
- season_tags must be an array containing EXACTLY ONE value from: summer, winter, all-season
  Do not return multiple season tags — pick the single best fit.

Season tagging — use VISUAL cues only (do not guess fabric):
1. Summer: shorts, tank tops, sleeveless tops, crop tops,
   sandals, flip-flops, sundresses, swim-adjacent items,
   visibly lightweight or sheer garments
2. Winter: heavy coats, puffer jackets, parkas, thick scarves,
   gloves, beanies, snow boots, items that are visibly bulky
   or padded
3. All-season: long-sleeve tops, jeans, trousers, sneakers,
   standard t-shirts, button-down shirts, blazers, hoodies,
   items with medium visual weight
4. Accessories: default to all-season UNLESS visibly seasonal
   (straw hat → summer, wool beanie → winter)

Key rule: if you cannot determine the season from shape and
coverage alone, tag as all-season.

Calibration examples:
- Denim shorts → season_tags: ["summer"]  (shorts = summer)
- White sleeveless top → season_tags: ["summer"]  (sleeveless = summer)
- Sundress → season_tags: ["summer"]  (sun dress = summer)
- Black puffer jacket → season_tags: ["winter"]  (visibly padded/bulky = winter)
- Heavy parka → season_tags: ["winter"]  (heavy coat = winter)
- Grey hoodie → season_tags: ["all-season"]  (medium visual weight = all-season)
- Grey crew-neck sweater → season_tags: ["all-season"]  (long-sleeve, medium weight = all-season)
- White t-shirt → season_tags: ["all-season"]  (standard tee = all-season)
- Blue jeans → season_tags: ["all-season"]  (trousers = all-season)
- White button-down shirt → season_tags: ["all-season"]  (button-down = all-season)
- Leather crossbody bag → season_tags: ["all-season"]  (accessory, no seasonal cue)
- Straw sun hat → season_tags: ["summer"]  (visibly seasonal accessory)
- Wool beanie → season_tags: ["winter"]  (visibly seasonal accessory)

Return ONLY this JSON:
{
  "category": string,
  "name_suggestion": string,
  "colours": string[],
  "season_tags": string[],
  "tags": string[],
  "dominant_colour_hex": string
}`;

/** Re-run Claude tagging on all active wardrobe items for the signed-in user. */
export const retagAll = action({
  args: {},
  handler: async (ctx): Promise<{ retagged: number; failed: number }> => {
    const { internal } = await import("./_generated/api");

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "unauthenticated" });

    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new ConvexError({ code: "user_not_found" });

    const items = await ctx.runQuery(internal.wardrobe.listAllActiveForUser, {
      userId: user._id,
    });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let retagged = 0;
    let failed = 0;

    for (const item of items) {
      try {
        // Download the stored image
        const imageRes = await fetch(item.imageUrl);
        if (!imageRes.ok) throw new Error(`fetch ${imageRes.status}`);
        const arrayBuf = await imageRes.arrayBuffer();
        const base64Image = Buffer.from(arrayBuf).toString("base64");

        let taggingResult: ReturnType<typeof validateAndNormalise> | null = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await anthropic.messages.create({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 500,
              system: WARDROBE_TAGGING_SYSTEM,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Analyse this clothing item and return the metadata JSON." },
                    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Image } },
                  ],
                },
              ],
            });

            const firstBlock = response.content[0];
            const text = firstBlock?.type === "text" ? firstBlock.text : "";
            const parsed = parseTaggingResponse(text);
            if (parsed) {
              taggingResult = validateAndNormalise(parsed);
              break;
            }
            if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
          } catch (err) {
            if (attempt === 1) throw err;
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        if (!taggingResult) throw new Error("tagging_failed");

        await ctx.runMutation(internal.wardrobe.patchItemTags, {
          itemId: item._id,
          seasonTags: taggingResult.seasonTags,
          category: taggingResult.category,
          colours: taggingResult.colours,
          tags: taggingResult.tags,
          dominantColourHex: taggingResult.dominantColourHex,
          name: taggingResult.name,
        });

        retagged++;
        // Small delay to avoid hitting Claude rate limits
        if (retagged < items.length) await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("wardrobeUpload.retagAll: item failed", {
          userId: user._id,
          itemId: item._id,
          errMsg,
        });
        failed++;
      }
    }

    return { retagged, failed };
  },
});

export const upload = action({
  args: {
    fileBuffer: v.bytes(),
    mimeType: v.string(),
  },
  handler: async (ctx, { fileBuffer, mimeType }): Promise<{ itemId: string; imageUrl: string; name: string }> => {
    // Dynamic import breaks the static circular dependency with _generated/api
    const { internal } = await import("./_generated/api");

    // Auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "unauthenticated" });

    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new ConvexError({ code: "user_not_found" });

    // Validate MIME type
    if (!validateMimeType(mimeType)) {
      throw new ConvexError({ code: "invalid_file_type" });
    }

    // Validate file size
    if (!validateFileSize(fileBuffer.byteLength)) {
      throw new ConvexError({ code: "file_too_large" });
    }

    // Check 200-item limit
    const activeCount = await ctx.runQuery(internal.wardrobe.countActive, {
      userId: user._id,
    });
    if (activeCount >= MAX_ACTIVE_ITEMS) {
      throw new ConvexError({ code: "wardrobe_full" });
    }

    // Resize with sharp — max 1200px longest side, JPEG 85%
    const sharp = (await import("sharp")).default;
    const buffer = Buffer.from(fileBuffer);
    const resized = await sharp(buffer)
      .rotate() // auto-rotate based on EXIF orientation (fixes upside-down / sideways camera photos)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Store in Convex Storage
    const blob = new Blob([new Uint8Array(resized)], { type: "image/jpeg" });
    const storageId = await ctx.storage.store(blob);
    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) throw new ConvexError({ code: "storage_failed" });

    // Call Claude for tagging (2 attempts)
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const base64Image = resized.toString("base64");

    let taggingResult: ReturnType<typeof validateAndNormalise> | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: WARDROBE_TAGGING_SYSTEM,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyse this clothing item and return the metadata JSON.",
                },
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        });

        const firstBlock = response.content[0];
        const text = firstBlock?.type === "text" ? firstBlock.text : "";
        const parsed = parseTaggingResponse(text);
        if (parsed) {
          taggingResult = validateAndNormalise(parsed);
          break;
        }
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const status = (err as { status?: number }).status;
        console.error(
          "wardrobeUpload.upload: Claude tagging failed",
          { userId: user._id, attempt, status, errMsg }
        );
        if (attempt === 1) {
          throw new ConvexError({ code: "tagging_failed" });
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!taggingResult) {
      throw new ConvexError({ code: "tagging_failed" });
    }

    // Insert wardrobe item
    const itemId = await ctx.runMutation(internal.wardrobe.insertItem, {
      userId: user._id,
      storageId,
      imageUrl,
      name: taggingResult.name,
      category: taggingResult.category,
      colours: taggingResult.colours,
      tags: taggingResult.tags,
      seasonTags: taggingResult.seasonTags,
      dominantColourHex: taggingResult.dominantColourHex,
    });

    // Mark shopping cache stale
    await ctx.runMutation(internal.wardrobe.setShoppingCacheInvalid, {
      userId: user._id,
    });

    return { itemId, imageUrl, name: taggingResult.name };
  },
});
