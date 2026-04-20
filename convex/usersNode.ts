"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { HAIKU, PHOTO_SUMMARY_SYSTEM } from "../lib/claude";

export const uploadPhoto = action({
  args: {
    fileBuffer: v.bytes(),
  },
  handler: async (ctx, { fileBuffer }): Promise<{ profilePhotoUrl: string; profilePhotoSummary: string }> => {
    const { internal } = await import("./_generated/api");

    // Auth
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("unauthenticated");
    const user = await ctx.runQuery(internal.users.getByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("user_not_found");

    // Resize to max 600px longest side, JPEG 85%
    const sharp = (await import("sharp")).default;
    const buffer = Buffer.from(fileBuffer);
    const resized = await sharp(buffer)
      .resize(600, 600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Store in Convex Storage
    const storageId = await ctx.storage.store(
      new Blob([resized.buffer as ArrayBuffer], { type: "image/jpeg" })
    );
    const url = await ctx.storage.getUrl(storageId);
    if (!url) throw new Error("Failed to get storage URL");

    // Generate Claude summary — failure is non-blocking
    let summary = "Appearance not available";
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const base64 = resized.toString("base64");
      const res = await anthropic.messages.create({
        model: HAIKU,
        max_tokens: 100,
        system: PHOTO_SUMMARY_SYSTEM,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: base64 },
              },
            ],
          },
        ],
      });
      const text = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
      if (text) {
        summary = text.slice(0, 200);
      }
    } catch (err) {
      console.error("usersNode.uploadPhoto: Claude summary failed", {
        userId: user._id,
        err: String(err),
      });
    }

    // Persist via internal mutation
    await ctx.runMutation(internal.users.savePhoto, {
      userId: user._id,
      storageId,
      profilePhotoUrl: url,
      profilePhotoSummary: summary,
    });

    return { profilePhotoUrl: url, profilePhotoSummary: summary };
  },
});
