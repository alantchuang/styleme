/** Number of swipes before contextMode graduates to 'auto_detect' */
export const COLD_START_SWIPE_THRESHOLD = 20;

/** Minimum swipes before shopping recommendations are shown */
export const SHOPPING_EMPTY_STATE_THRESHOLD = 10;

/** Hours before shopping gap cache is considered stale */
export const SHOPPING_GAP_STALE_HOURS = 24;

/** Rotating messages shown during outfit generation loading (cycles every 1.8s, 200ms fade) */
export const OUTFIT_LOADING_MESSAGES = [
  "Reading your wardrobe...",
  "Checking today's weather...",
  "Applying your style preferences...",
  "Building outfit combinations...",
  "Adding finishing touches...",
];

/** Sequential thinking steps shown during shopping regeneration (▸ active / ✓ completed, 2s per step, loops) */
export const SHOPPING_LOADING_STEPS = [
  "Reviewing what you own...",
  "Spotting the gaps...",
  "Matching to your style...",
  "Prioritising your needs...",
  "Almost ready...",
];
