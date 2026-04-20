import { useEffect, useState } from "react";

/**
 * Returns true after `delayMs` while `isActive` is true.
 * Resets immediately when `isActive` becomes false.
 */
export function useSlowIndicator(isActive: boolean, delayMs = 3000): boolean {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsSlow(false);
      return;
    }
    const timer = setTimeout(() => setIsSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [isActive, delayMs]);

  return isSlow;
}
