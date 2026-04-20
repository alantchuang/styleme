import { describe, it, expect } from "vitest";
import { sanitiseOccasion, isValidOccasion } from "../occasionUtils";

describe("sanitiseOccasion", () => {
  it("trims leading and trailing whitespace", () => {
    expect(sanitiseOccasion("  Casual  ")).toBe("Casual");
  });

  it("collapses multiple spaces to one", () => {
    expect(sanitiseOccasion("Date   night")).toBe("Date night");
  });

  it("trims then collapses", () => {
    expect(sanitiseOccasion("  Date   night  ")).toBe("Date night");
  });

  it("truncates to 80 characters", () => {
    const long = "a".repeat(100);
    expect(sanitiseOccasion(long)).toHaveLength(80);
  });

  it("leaves a 80-char string unchanged in length", () => {
    const exact = "a".repeat(80);
    expect(sanitiseOccasion(exact)).toHaveLength(80);
  });

  it("returns empty string for whitespace-only input", () => {
    expect(sanitiseOccasion("   ")).toBe("");
  });

  it("preserves case", () => {
    expect(sanitiseOccasion("Wedding Guest")).toBe("Wedding Guest");
  });

  it("handles empty string", () => {
    expect(sanitiseOccasion("")).toBe("");
  });
});

describe("isValidOccasion", () => {
  it("returns true for a normal word", () => {
    expect(isValidOccasion("Casual")).toBe(true);
  });

  it("returns true for 2 non-whitespace characters", () => {
    expect(isValidOccasion("ab")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isValidOccasion("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isValidOccasion("   ")).toBe(false);
  });

  it("returns false for single non-whitespace character", () => {
    expect(isValidOccasion("a")).toBe(false);
  });

  it("returns true for 2 chars with spaces around them", () => {
    // After sanitiseOccasion, spaces are trimmed — but isValidOccasion works on sanitised
    expect(isValidOccasion(" a b ")).toBe(true); // 2 non-whitespace chars
  });
});

describe("sanitiseOccasion + isValidOccasion together", () => {
  it("whitespace-only input is invalid", () => {
    const sanitised = sanitiseOccasion("   ");
    expect(isValidOccasion(sanitised)).toBe(false);
  });

  it("single-word input is valid", () => {
    const sanitised = sanitiseOccasion("  Gym  ");
    expect(isValidOccasion(sanitised)).toBe(true);
  });

  it("100-char input truncated to 80 is still valid", () => {
    const sanitised = sanitiseOccasion("a".repeat(100));
    expect(isValidOccasion(sanitised)).toBe(true);
  });

  it("single char is invalid", () => {
    const sanitised = sanitiseOccasion("x");
    expect(isValidOccasion(sanitised)).toBe(false);
  });
});
