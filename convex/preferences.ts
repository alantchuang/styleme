import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { SONNET } from "../lib/claude";

// PROMPT_VERSION: preference_recalc_v1
const PREFERENCE_RECALC_SYSTEM = `You are a fashion preference analyst. Analyse a user's outfit swipe
history to identify their genuine style preferences.

Rules:
- Focus on patterns, not individual swipes. 5+ consistent signals = preference.
- Be specific. 'Prefers navy and white' beats 'prefers neutral colours'.
- Do not project preferences the data doesn't support.
- Keep all arrays: maximum 5 items each.
- Merge conservatively with the existing summary — preserve prior
  preferences that the new batch doesn't contradict. The existing
  summary captures long-term patterns from swipes before this window.
  Do not discard them.

Return ONLY this JSON. No markdown.
{
  "liked_colours": string[],
  "avoided_colours": string[],
  "liked_styles": string[],
  "avoided_styles": string[],
  "preferred_silhouettes": string[],
  "preferred_occasions": string[],
  "summary_sentence": string
}`;

/** Scheduled internal action — called by swipes.record every 5 swipes. */
export const recalculate = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const { internal } = await import("./_generated/api");

    const swipeData = await ctx.runQuery(internal.preferences.getSwipeData, { userId });

    if (swipeData.swipes.length < 5) {
      // Not enough data yet — skip silently
      return;
    }

    const swipeLines = swipeData.swipes
      .map((s) => {
        const styleTags = s.outfit?.styleTags?.join(",") ?? "";
        const colourPalette = s.outfit?.colourPalette?.join(",") ?? "";
        return `${s.liked ? "LIKED" : "SKIPPED"} | ${s.occasion} | ${styleTags} | ${colourPalette}`;
      })
      .join("\n");

    const userMessage = `Analyse this swipe history and return an updated preference summary.
The existing summary represents long-term patterns — preserve anything
the new swipes don't contradict.

=== SWIPE HISTORY (most recent 20) ===
${swipeLines}

=== EXISTING PREFERENCE SUMMARY ===
${JSON.stringify(swipeData.existingPreferenceSummary ?? {})}

Return updated preference summary JSON.`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await anthropic.messages.create({
          model: SONNET,
          max_tokens: 600,
          system: PREFERENCE_RECALC_SYSTEM,
          messages: [{ role: "user", content: userMessage }],
        });
        const text = res.content[0]?.type === "text" ? res.content[0].text : "";
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);

        const truncate = (arr: unknown): string[] =>
          (Array.isArray(arr) ? arr : []).slice(0, 5).map(String);

        const summary = {
          likedColours: truncate(parsed.liked_colours),
          avoidedColours: truncate(parsed.avoided_colours),
          likedStyles: truncate(parsed.liked_styles),
          avoidedStyles: truncate(parsed.avoided_styles),
          preferredSilhouettes: truncate(parsed.preferred_silhouettes),
          preferredOccasions: truncate(parsed.preferred_occasions),
          summarySentence: String(parsed.summary_sentence ?? "")
            .replace(/\n/g, " ")
            .slice(0, 200),
        };

        await ctx.runMutation(internal.preferences.savePreferenceSummary, {
          userId,
          summary,
        });
        return;
      } catch (err) {
        console.error("preferences.recalculate: Claude call failed", {
          userId,
          attempt,
          err: String(err),
        });
        if (attempt === 1) return; // failure logged, never surfaced to user
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  },
});

/** Internal query — fetches last 20 swipes with their outfit data for recalc. */
export const getSwipeData = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);

    const recentSwipes = await ctx.db
      .query("outfitSwipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    const swipesWithOutfits = await Promise.all(
      recentSwipes.map(async (s) => {
        const outfit = await ctx.db.get(s.outfitId);
        return {
          liked: s.liked,
          occasion: s.occasion,
          outfit: outfit
            ? { styleTags: outfit.styleTags, colourPalette: outfit.colourPalette }
            : null,
        };
      })
    );

    return {
      swipes: swipesWithOutfits,
      existingPreferenceSummary: user?.preferenceSummary ?? null,
    };
  },
});

/** Internal mutation — writes the merged preference summary to the user doc. */
export const savePreferenceSummary = internalMutation({
  args: {
    userId: v.id("users"),
    summary: v.object({
      likedColours: v.array(v.string()),
      avoidedColours: v.array(v.string()),
      likedStyles: v.array(v.string()),
      avoidedStyles: v.array(v.string()),
      preferredSilhouettes: v.array(v.string()),
      preferredOccasions: v.array(v.string()),
      summarySentence: v.string(),
    }),
  },
  handler: async (ctx, { userId, summary }) => {
    await ctx.db.patch(userId, { preferenceSummary: summary });
  },
});
