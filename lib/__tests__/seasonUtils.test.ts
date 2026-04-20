import { describe, it, expect } from "vitest";
import {
  getSeasonForMonth,
  filterBySeason,
  type Season,
  type Hemisphere,
} from "../seasonUtils";

// ── getCurrentSeason: all 24 month × hemisphere combinations ────────────────

describe("getSeasonForMonth — northern hemisphere", () => {
  const h: Hemisphere = "northern";
  it("Jan → winter", () => expect(getSeasonForMonth(1, h)).toBe("winter"));
  it("Feb → winter", () => expect(getSeasonForMonth(2, h)).toBe("winter"));
  it("Mar → spring", () => expect(getSeasonForMonth(3, h)).toBe("spring"));
  it("Apr → spring", () => expect(getSeasonForMonth(4, h)).toBe("spring"));
  it("May → spring", () => expect(getSeasonForMonth(5, h)).toBe("spring"));
  it("Jun → summer", () => expect(getSeasonForMonth(6, h)).toBe("summer"));
  it("Jul → summer", () => expect(getSeasonForMonth(7, h)).toBe("summer"));
  it("Aug → summer", () => expect(getSeasonForMonth(8, h)).toBe("summer"));
  it("Sep → autumn", () => expect(getSeasonForMonth(9, h)).toBe("autumn"));
  it("Oct → autumn", () => expect(getSeasonForMonth(10, h)).toBe("autumn"));
  it("Nov → autumn", () => expect(getSeasonForMonth(11, h)).toBe("autumn"));
  it("Dec → winter", () => expect(getSeasonForMonth(12, h)).toBe("winter"));
});

describe("getSeasonForMonth — southern hemisphere (reversed)", () => {
  const h: Hemisphere = "southern";
  it("Jan → summer", () => expect(getSeasonForMonth(1, h)).toBe("summer"));
  it("Feb → summer", () => expect(getSeasonForMonth(2, h)).toBe("summer"));
  it("Mar → autumn", () => expect(getSeasonForMonth(3, h)).toBe("autumn"));
  it("Apr → autumn", () => expect(getSeasonForMonth(4, h)).toBe("autumn"));
  it("May → autumn", () => expect(getSeasonForMonth(5, h)).toBe("autumn"));
  it("Jun → winter", () => expect(getSeasonForMonth(6, h)).toBe("winter"));
  it("Jul → winter", () => expect(getSeasonForMonth(7, h)).toBe("winter"));
  it("Aug → winter", () => expect(getSeasonForMonth(8, h)).toBe("winter"));
  it("Sep → spring", () => expect(getSeasonForMonth(9, h)).toBe("spring"));
  it("Oct → spring", () => expect(getSeasonForMonth(10, h)).toBe("spring"));
  it("Nov → spring", () => expect(getSeasonForMonth(11, h)).toBe("spring"));
  it("Dec → summer", () => expect(getSeasonForMonth(12, h)).toBe("summer"));
});

// ── filterBySeason edge cases ─────────────────────────────────────────────────

const makeItem = (seasonTags: string[], category = "tops") => ({
  seasonTags,
  category,
});

describe("filterBySeason — empty array", () => {
  it("returns [] for empty input", () => {
    expect(filterBySeason([], "summer")).toEqual([]);
  });
});

describe("filterBySeason — all-season items", () => {
  it("includes all-season items in summer", () => {
    const items = [makeItem(["all-season"])];
    expect(filterBySeason(items, "summer")).toHaveLength(1);
  });

  it("includes all-season items in winter", () => {
    const items = [makeItem(["all-season"])];
    expect(filterBySeason(items, "winter")).toHaveLength(1);
  });

  it("includes all-season items in spring", () => {
    const items = [makeItem(["all-season"])];
    expect(filterBySeason(items, "spring")).toHaveLength(1);
  });

  it("includes all-season items in autumn", () => {
    const items = [makeItem(["all-season"])];
    expect(filterBySeason(items, "autumn")).toHaveLength(1);
  });
});

describe("filterBySeason — empty seasonTags treated as all-season", () => {
  it("includes items with no season tags in any season", () => {
    const items = [makeItem([])];
    const seasons: Season[] = ["summer", "winter", "spring", "autumn"];
    for (const s of seasons) {
      expect(filterBySeason(items, s)).toHaveLength(1);
    }
  });
});

describe("filterBySeason — summer season", () => {
  it("includes summer-tagged items", () => {
    const items = [makeItem(["summer"])];
    expect(filterBySeason(items, "summer")).toHaveLength(1);
  });

  it("excludes winter-only items", () => {
    const items = [makeItem(["winter"])];
    expect(filterBySeason(items, "summer")).toHaveLength(0);
  });
});

describe("filterBySeason — winter season (December northern)", () => {
  it("includes winter-tagged items", () => {
    const items = [makeItem(["winter"])];
    expect(filterBySeason(items, "winter")).toHaveLength(1);
  });

  it("excludes summer-only items", () => {
    const items = [makeItem(["summer"])];
    expect(filterBySeason(items, "winter")).toHaveLength(0);
  });
});

describe("filterBySeason — spring season", () => {
  it("includes summer-tagged items (spring = transitional warm)", () => {
    const items = [makeItem(["summer"])];
    expect(filterBySeason(items, "spring")).toHaveLength(1);
  });

  it("excludes winter-only items in spring", () => {
    const items = [makeItem(["winter"])];
    expect(filterBySeason(items, "spring")).toHaveLength(0);
  });
});

describe("filterBySeason — autumn season", () => {
  it("includes winter-tagged items (autumn = transitional cold)", () => {
    const items = [makeItem(["winter"])];
    expect(filterBySeason(items, "autumn")).toHaveLength(1);
  });

  it("excludes summer-only items in autumn", () => {
    const items = [makeItem(["summer"])];
    expect(filterBySeason(items, "autumn")).toHaveLength(0);
  });
});

describe("filterBySeason — accessories never filtered", () => {
  const seasons: Season[] = ["summer", "winter", "spring", "autumn"];

  it.each(seasons)("includes accessories in %s regardless of season tags", (season) => {
    const item = makeItem(["winter"], "accessories");
    expect(filterBySeason([item], season)).toHaveLength(1);
  });

  it("includes accessories with summer tags in winter", () => {
    const item = makeItem(["summer"], "accessories");
    expect(filterBySeason([item], "winter")).toHaveLength(1);
  });
});

describe("filterBySeason — fewer than 5 items in a category", () => {
  it("filters correctly with small category", () => {
    const items = [
      makeItem(["summer"], "tops"),
      makeItem(["summer"], "tops"),
      makeItem(["winter"], "tops"),
    ];
    const result = filterBySeason(items, "winter");
    // Only the winter-tagged top should remain
    expect(result).toHaveLength(1);
  });

  it("returns all items if all are all-season, regardless of count", () => {
    const items = [makeItem(["all-season"]), makeItem(["all-season"])];
    expect(filterBySeason(items, "winter")).toHaveLength(2);
  });
});

describe("filterBySeason — mixed items", () => {
  it("handles mix of summer, winter, all-season in summer", () => {
    const items = [
      makeItem(["summer"]),
      makeItem(["winter"]),
      makeItem(["all-season"]),
      makeItem([]),
    ];
    const result = filterBySeason(items, "summer");
    expect(result).toHaveLength(3); // summer + all-season + no-tags
  });

  it("handles mix of summer, winter, all-season in winter", () => {
    const items = [
      makeItem(["summer"]),
      makeItem(["winter"]),
      makeItem(["all-season"]),
      makeItem([]),
    ];
    const result = filterBySeason(items, "winter");
    expect(result).toHaveLength(3); // winter + all-season + no-tags
  });
});
