// Pure validation/normalisation logic — shared by convex/wardrobeUpload.ts and unit tests.

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_ACTIVE_ITEMS = 200;

export const ALLOWED_CATEGORIES = [
  "tops", "bottoms", "shoes", "outerwear", "accessories", "dresses", "bags",
] as const;
export type Category = typeof ALLOWED_CATEGORIES[number];

export const ALLOWED_SEASON_TAGS = ["summer", "winter", "all-season"] as const;

export interface RawTaggingResult {
  category: string;
  name_suggestion: string;
  colours: string[];
  season_tags: string[];
  tags: string[];
  dominant_colour_hex: string;
}

export interface NormalisedTaggingResult {
  category: Category;
  name: string;
  colours: string[];
  seasonTags: string[];
  tags: string[];
  dominantColourHex: string;
}

export function validateMimeType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function validateFileSize(bytes: number): boolean {
  return bytes <= MAX_FILE_SIZE_BYTES;
}

const COLOUR_HEX_MAP: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#CC3333",
  blue: "#3355BB",
  navy: "#1C2951",
  green: "#336633",
  yellow: "#DDCC33",
  orange: "#DD6633",
  purple: "#663399",
  pink: "#EE6699",
  brown: "#663333",
  grey: "#888888",
  gray: "#888888",
  cream: "#FFFDD0",
  beige: "#F5F5DC",
  camel: "#C19A6B",
  tan: "#D2B48C",
  khaki: "#C3B091",
  olive: "#808000",
  teal: "#008080",
  coral: "#FF6B6B",
  burgundy: "#800020",
  maroon: "#800000",
  mint: "#98FF98",
  lavender: "#E6E6FA",
  gold: "#FFD700",
  silver: "#C0C0C0",
  "dark blue": "#1C2951",
  "light blue": "#ADD8E6",
  "dark green": "#1A5C1A",
  "light green": "#90EE90",
  "light grey": "#D3D3D3",
  "dark grey": "#555555",
};

export function deriveHexFromColourName(colourName: string): string {
  return COLOUR_HEX_MAP[colourName.toLowerCase().trim()] ?? "#888888";
}

/** Strip markdown fences and parse JSON. Returns null on failure. */
export function parseTaggingResponse(text: string): RawTaggingResult | null {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  try {
    return JSON.parse(cleaned) as RawTaggingResult;
  } catch {
    return null;
  }
}

/** Validate and normalise a raw Claude tagging response. */
export function validateAndNormalise(raw: RawTaggingResult): NormalisedTaggingResult {
  const category = (ALLOWED_CATEGORIES as readonly string[]).includes(raw.category)
    ? (raw.category as Category)
    : "accessories";

  // Enforce exactly one season tag. Specific beats general: summer/winter wins over all-season.
  // If both summer and winter appear (contradictory), keep the first.
  const validSeasonTags = (raw.season_tags ?? []).filter((t) =>
    (ALLOWED_SEASON_TAGS as readonly string[]).includes(t)
  );
  const seasonTags: string[] = validSeasonTags.includes("summer")
    ? ["summer"]
    : validSeasonTags.includes("winter")
      ? ["winter"]
      : validSeasonTags.includes("all-season")
        ? ["all-season"]
        : validSeasonTags.slice(0, 1);

  let dominantColourHex = raw.dominant_colour_hex ?? "";
  if (!/^#[0-9A-Fa-f]{6}$/.test(dominantColourHex)) {
    const firstColour = (raw.colours ?? [])[0] ?? "grey";
    dominantColourHex = deriveHexFromColourName(firstColour);
  }

  return {
    category,
    name: (raw.name_suggestion ?? "Clothing item").trim().slice(0, 100),
    colours: raw.colours ?? [],
    seasonTags,
    tags: raw.tags ?? [],
    dominantColourHex,
  };
}
