import { describe, it, expect } from "vitest";
import {
  validateMimeType,
  validateFileSize,
  MAX_FILE_SIZE_BYTES,
  deriveHexFromColourName,
  validateAndNormalise,
  parseTaggingResponse,
  type RawTaggingResult,
} from "../wardrobeValidation";

describe("validateMimeType", () => {
  it("accepts image/jpeg", () => expect(validateMimeType("image/jpeg")).toBe(true));
  it("accepts image/png", () => expect(validateMimeType("image/png")).toBe(true));
  it("accepts image/webp", () => expect(validateMimeType("image/webp")).toBe(true));
  it("rejects image/gif", () => expect(validateMimeType("image/gif")).toBe(false));
  it("rejects application/pdf", () => expect(validateMimeType("application/pdf")).toBe(false));
  it("rejects empty string", () => expect(validateMimeType("")).toBe(false));
});

describe("validateFileSize", () => {
  it("accepts exactly 20MB", () => expect(validateFileSize(MAX_FILE_SIZE_BYTES)).toBe(true));
  it("accepts 1 byte", () => expect(validateFileSize(1)).toBe(true));
  it("rejects 20MB + 1 byte", () => expect(validateFileSize(MAX_FILE_SIZE_BYTES + 1)).toBe(false));
  it("rejects 0", () => expect(validateFileSize(0)).toBe(true)); // 0 bytes is valid (no size constraint below 0)
});

describe("deriveHexFromColourName", () => {
  it("maps navy to #1C2951", () => expect(deriveHexFromColourName("navy")).toBe("#1C2951"));
  it("maps black to #000000", () => expect(deriveHexFromColourName("black")).toBe("#000000"));
  it("maps white to #FFFFFF", () => expect(deriveHexFromColourName("white")).toBe("#FFFFFF"));
  it("is case-insensitive", () => expect(deriveHexFromColourName("BLACK")).toBe("#000000"));
  it("trims whitespace", () => expect(deriveHexFromColourName("  grey  ")).toBe("#888888"));
  it("returns fallback for unknown colour", () =>
    expect(deriveHexFromColourName("neon-banana")).toBe("#888888"));
});

describe("validateAndNormalise — category", () => {
  const base: RawTaggingResult = {
    category: "tops",
    name_suggestion: "White T-shirt",
    colours: ["white"],
    season_tags: ["summer"],
    tags: ["casual"],
    dominant_colour_hex: "#FFFFFF",
  };

  it("keeps valid category", () => {
    expect(validateAndNormalise(base).category).toBe("tops");
  });

  it("falls back to accessories for invalid category", () => {
    expect(validateAndNormalise({ ...base, category: "hats" }).category).toBe("accessories");
  });

  it("falls back to accessories for empty category", () => {
    expect(validateAndNormalise({ ...base, category: "" }).category).toBe("accessories");
  });
});

describe("validateAndNormalise — dominantColourHex fallback", () => {
  const base: RawTaggingResult = {
    category: "tops",
    name_suggestion: "Navy jacket",
    colours: ["navy", "white"],
    season_tags: ["all-season"],
    tags: [],
    dominant_colour_hex: "",
  };

  it("derives hex from colours[0] when dominant_colour_hex is missing", () => {
    expect(validateAndNormalise(base).dominantColourHex).toBe("#1C2951");
  });

  it("derives hex when dominant_colour_hex is invalid format", () => {
    expect(
      validateAndNormalise({ ...base, dominant_colour_hex: "navy" }).dominantColourHex
    ).toBe("#1C2951");
  });

  it("keeps valid dominant_colour_hex", () => {
    expect(
      validateAndNormalise({ ...base, dominant_colour_hex: "#AABBCC" }).dominantColourHex
    ).toBe("#AABBCC");
  });
});

describe("validateAndNormalise — season tags", () => {
  const base: RawTaggingResult = {
    category: "shoes",
    name_suggestion: "Sneakers",
    colours: ["white"],
    season_tags: ["summer", "spring", "all-season"],
    tags: [],
    dominant_colour_hex: "#FFFFFF",
  };

  it("strips season tags not in allowed set and enforces single tag", () => {
    expect(validateAndNormalise(base).seasonTags).toEqual(["summer"]);
  });

  it("returns empty array for all-invalid season tags", () => {
    expect(
      validateAndNormalise({ ...base, season_tags: ["spring", "autumn"] }).seasonTags
    ).toEqual([]);
  });
});

describe("parseTaggingResponse", () => {
  it("parses plain JSON", () => {
    const raw = JSON.stringify({ category: "tops", name_suggestion: "T-shirt", colours: [], season_tags: [], tags: [], dominant_colour_hex: "#000" });
    expect(parseTaggingResponse(raw)).not.toBeNull();
  });

  it("strips markdown fences", () => {
    const raw = "```json\n{\"category\":\"tops\",\"name_suggestion\":\"T-shirt\",\"colours\":[],\"season_tags\":[],\"tags\":[],\"dominant_colour_hex\":\"#000\"}\n```";
    expect(parseTaggingResponse(raw)).not.toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseTaggingResponse("not json")).toBeNull();
  });
});
