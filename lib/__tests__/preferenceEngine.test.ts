import { describe, it, expect } from "vitest";
import { truncateSummary, mergeSummary, type PreferenceSummary } from "../preferenceEngine";

const base: PreferenceSummary = {
  likedColours: ["navy", "cream", "camel"],
  avoidedColours: ["neon"],
  likedStyles: ["minimalist", "classic"],
  avoidedStyles: ["bold"],
  preferredSilhouettes: ["hourglass"],
  preferredOccasions: ["casual", "work"],
  summarySentence: "Prefers clean, neutral looks.",
};

describe("truncateSummary", () => {
  it("does not modify arrays within limit", () => {
    const result = truncateSummary(base);
    expect(result.likedColours).toEqual(base.likedColours);
    expect(result.likedStyles).toEqual(base.likedStyles);
  });

  it("truncates all array fields to max 5", () => {
    const long: PreferenceSummary = {
      ...base,
      likedColours: ["a", "b", "c", "d", "e", "f", "g"],
      likedStyles: ["1", "2", "3", "4", "5", "6"],
      avoidedColours: ["x", "y", "z", "w", "v", "u"],
    };
    const result = truncateSummary(long);
    expect(result.likedColours).toHaveLength(5);
    expect(result.likedStyles).toHaveLength(5);
    expect(result.avoidedColours).toHaveLength(5);
  });

  it("preserves summarySentence unchanged", () => {
    const result = truncateSummary(base);
    expect(result.summarySentence).toBe(base.summarySentence);
  });
});

describe("mergeSummary", () => {
  it("returns truncated incoming when existing is null", () => {
    const incoming: PreferenceSummary = {
      ...base,
      likedColours: ["navy", "white", "grey", "black", "camel", "extra"],
    };
    const result = mergeSummary(null, incoming);
    expect(result.likedColours).toHaveLength(5);
    expect(result.summarySentence).toBe(incoming.summarySentence);
  });

  it("preserves existing liked colours not in incoming avoided list", () => {
    const existing: PreferenceSummary = {
      ...base,
      likedColours: ["navy", "cream"],
    };
    const incoming: PreferenceSummary = {
      ...base,
      likedColours: ["white"],
      avoidedColours: ["neon"], // does not include navy or cream
      summarySentence: "Updated sentence.",
    };
    const result = mergeSummary(existing, incoming);
    expect(result.likedColours).toContain("navy");
    expect(result.likedColours).toContain("cream");
    expect(result.likedColours).toContain("white");
  });

  it("does not preserve existing items contradicted by incoming avoided list", () => {
    const existing: PreferenceSummary = {
      ...base,
      likedColours: ["neon", "navy"],
    };
    const incoming: PreferenceSummary = {
      ...base,
      likedColours: ["white"],
      avoidedColours: ["neon"],
      summarySentence: "Updated.",
    };
    const result = mergeSummary(existing, incoming);
    expect(result.likedColours).not.toContain("neon");
    expect(result.likedColours).toContain("navy");
  });

  it("deduplicates merged arrays (case-insensitive)", () => {
    const existing: PreferenceSummary = {
      ...base,
      likedColours: ["Navy", "Cream"],
    };
    const incoming: PreferenceSummary = {
      ...base,
      likedColours: ["navy", "white"],
      avoidedColours: [],
      summarySentence: "Updated.",
    };
    const result = mergeSummary(existing, incoming);
    const lowerResult = result.likedColours.map((c) => c.toLowerCase());
    const uniqueNavy = lowerResult.filter((c) => c === "navy");
    expect(uniqueNavy).toHaveLength(1);
  });

  it("truncates merged result to max 5 per array", () => {
    const existing: PreferenceSummary = {
      ...base,
      likedColours: ["a", "b", "c"],
    };
    const incoming: PreferenceSummary = {
      ...base,
      likedColours: ["d", "e", "f", "g"],
      avoidedColours: [],
      summarySentence: "Updated.",
    };
    const result = mergeSummary(existing, incoming);
    expect(result.likedColours.length).toBeLessThanOrEqual(5);
  });

  it("always uses incoming summarySentence", () => {
    const incoming: PreferenceSummary = {
      ...base,
      summarySentence: "New sentence from latest batch.",
    };
    const result = mergeSummary(base, incoming);
    expect(result.summarySentence).toBe("New sentence from latest batch.");
  });
});
