import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserFromAction } from "./users";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export const get = action({
  args: {},
  handler: async (ctx): Promise<{ condition: string | null; tempC: number | null; needsLocation: boolean }> => {
    const { internal } = await import("./_generated/api");
    const user = await getCurrentUserFromAction(ctx);

    const hasCoords = user.locationLat !== undefined && user.locationLng !== undefined;
    const needsLocation = !hasCoords;

    const cache = user.weatherCache;
    const cacheIsFresh = cache && Date.now() - cache.cachedAt < CACHE_TTL_MS;
    // If we now have location data but the cache holds nulls, treat as stale so we re-fetch.
    const cacheIsNullWithLocation = !needsLocation && cache && cache.condition === null;
    if (cacheIsFresh && !cacheIsNullWithLocation) {
      return { condition: cache.condition, tempC: cache.tempC, needsLocation };
    }

    if (needsLocation) {
      return { condition: null, tempC: null, needsLocation: true };
    }

    let condition: string | null = null;
    let tempC: number | null = null;

    try {
      ({ condition, tempC } = await fetchOpenMeteo(
        user.locationLat ?? null,
        user.locationLng ?? null,
      ));
    } catch (err) {
      console.error("weather.get: Open-Meteo fetch failed", { userId: user._id, err: String(err) });
    }

    await ctx.runMutation(internal.weather.saveCache, {
      userId: user._id,
      condition,
      tempC,
      cachedAt: Date.now(),
    });

    return { condition, tempC, needsLocation: false };
  },
});

export const saveCache = internalMutation({
  args: {
    userId: v.id("users"),
    condition: v.union(v.string(), v.null()),
    tempC: v.union(v.number(), v.null()),
    cachedAt: v.number(),
  },
  handler: async (ctx, { userId, condition, tempC, cachedAt }) => {
    await ctx.db.patch(userId, { weatherCache: { condition, tempC, cachedAt } });
  },
});

async function fetchOpenMeteo(
  lat: number | null,
  lng: number | null,
): Promise<{ condition: string | null; tempC: number | null }> {
  if (lat == null || lng == null) return { condition: null, tempC: null };

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
  const data = await res.json();

  const code: number = data.current?.weather_code ?? 0;
  const condition =
    code === 0               ? "sunny"  :
    code <= 3                ? "cloudy" :
    code >= 51 && code <= 67 ? "rainy"  :
    code >= 71 && code <= 77 ? "cold"   :
    code >= 80 && code <= 82 ? "rainy"  :
    code >= 95               ? "rainy"  : "cloudy";

  return {
    condition,
    tempC: data.current?.temperature_2m ?? null,
  };
}
