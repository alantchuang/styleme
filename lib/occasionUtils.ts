/** Sanitise a custom occasion string per PromptTemplates §6.2 */
export function sanitiseOccasion(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 80);
}

/** Check if a sanitised occasion has >= 2 non-whitespace characters */
export function isValidOccasion(sanitised: string): boolean {
  return sanitised.replace(/\s/g, "").length >= 2;
}
