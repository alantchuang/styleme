export type Season = "spring" | "summer" | "autumn" | "winter";
export type Hemisphere = "northern" | "southern";

/** Derive hemisphere from latitude. Falls back to northern if lat is unknown. */
export function hemisphereFromLat(lat: number | null | undefined): Hemisphere {
  return (lat ?? 0) < 0 ? "southern" : "northern";
}

export interface SeasonableItem {
  seasonTags: string[];
}

/**
 * Returns the current season based on the current month and hemisphere.
 * Uses local month, not server UTC.
 */
export function getCurrentSeason(hemisphere: Hemisphere): Season {
  const month = new Date().getMonth() + 1; // 1–12
  return getSeasonForMonth(month, hemisphere);
}

export function getSeasonForMonth(month: number, hemisphere: Hemisphere): Season {
  const northernSeason = ((): Season => {
    if (month === 12 || month <= 2) return "winter";
    if (month <= 5) return "spring";
    if (month <= 8) return "summer";
    return "autumn";
  })();

  if (hemisphere === "northern") return northernSeason;

  const opposite: Record<Season, Season> = {
    winter: "summer",
    summer: "winter",
    spring: "autumn",
    autumn: "spring",
  };
  return opposite[northernSeason];
}

/**
 * Filters wardrobe items by the current season.
 * Items with empty seasonTags are treated as all-season.
 * Accessories are never filtered.
 *
 * Wardrobe tags use three values: "summer", "winter", "all-season".
 * Spring maps to summer-tagged items; autumn maps to winter-tagged items.
 */
export function filterBySeason<T extends SeasonableItem & { category?: string }>(
  items: T[],
  season: Season
): T[] {
  if (items.length === 0) return [];

  return items.filter((item) => {
    if (item.category === "accessories") return true;
    if (!item.seasonTags || item.seasonTags.length === 0) return true;
    if (item.seasonTags.includes("all-season")) return true;

    // Spring/summer → include items tagged "summer"
    // Autumn/winter → include items tagged "winter"
    if (season === "summer" || season === "spring") {
      return item.seasonTags.includes("summer");
    }
    return item.seasonTags.includes("winter");
  });
}
