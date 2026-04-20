export type PreferenceSummary = {
  likedColours: string[];
  avoidedColours: string[];
  likedStyles: string[];
  avoidedStyles: string[];
  preferredSilhouettes: string[];
  preferredOccasions: string[];
  summarySentence: string;
};

const MAX_ARRAY_LENGTH = 5;

/**
 * Truncates all array fields in a PreferenceSummary to MAX_ARRAY_LENGTH.
 * Does not modify the summarySentence.
 */
export function truncateSummary(summary: PreferenceSummary): PreferenceSummary {
  return {
    likedColours: summary.likedColours.slice(0, MAX_ARRAY_LENGTH),
    avoidedColours: summary.avoidedColours.slice(0, MAX_ARRAY_LENGTH),
    likedStyles: summary.likedStyles.slice(0, MAX_ARRAY_LENGTH),
    avoidedStyles: summary.avoidedStyles.slice(0, MAX_ARRAY_LENGTH),
    preferredSilhouettes: summary.preferredSilhouettes.slice(0, MAX_ARRAY_LENGTH),
    preferredOccasions: summary.preferredOccasions.slice(0, MAX_ARRAY_LENGTH),
    summarySentence: summary.summarySentence,
  };
}

/**
 * Merges an existing summary with an incoming (Claude-generated) summary.
 * Preserves existing items that are not contradicted by the incoming summary
 * (i.e. not in the incoming "avoided" lists), then deduplicates and truncates.
 * The summarySentence always comes from incoming (most recent).
 */
export function mergeSummary(
  existing: PreferenceSummary | null | undefined,
  incoming: PreferenceSummary
): PreferenceSummary {
  if (!existing) return truncateSummary(incoming);

  const mergeArrays = (
    existingArr: string[],
    incomingArr: string[],
    avoidList: string[]
  ): string[] => {
    const avoidSet = new Set(avoidList.map((s) => s.toLowerCase()));
    // Keep existing items not contradicted by new avoid list
    const preserved = existingArr.filter((v) => !avoidSet.has(v.toLowerCase()));
    // Union with incoming, deduped
    const merged = [...incomingArr];
    for (const v of preserved) {
      if (!merged.some((m) => m.toLowerCase() === v.toLowerCase())) {
        merged.push(v);
      }
    }
    return merged.slice(0, MAX_ARRAY_LENGTH);
  };

  return {
    likedColours: mergeArrays(
      existing.likedColours,
      incoming.likedColours,
      incoming.avoidedColours
    ),
    avoidedColours: mergeArrays(
      existing.avoidedColours,
      incoming.avoidedColours,
      incoming.likedColours
    ),
    likedStyles: mergeArrays(
      existing.likedStyles,
      incoming.likedStyles,
      incoming.avoidedStyles
    ),
    avoidedStyles: mergeArrays(
      existing.avoidedStyles,
      incoming.avoidedStyles,
      incoming.likedStyles
    ),
    preferredSilhouettes: mergeArrays(
      existing.preferredSilhouettes,
      incoming.preferredSilhouettes,
      []
    ),
    preferredOccasions: mergeArrays(
      existing.preferredOccasions,
      incoming.preferredOccasions,
      []
    ),
    summarySentence: incoming.summarySentence,
  };
}
