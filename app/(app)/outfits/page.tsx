"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import ColdStartPicker from "@/components/outfits/ColdStartPicker";
import SwipeStack from "@/components/outfits/SwipeStack";
import ContextOverrideSheet from "@/components/outfits/ContextOverrideSheet";
import ContextPill from "@/components/outfits/ContextPill";
import LocationSheet from "@/components/LocationSheet";
import { useToast } from "@/components/ToastProvider";
import RotatingMessage from "@/components/outfits/RotatingMessage";
import { OUTFIT_LOADING_MESSAGES } from "@/lib/constants";
import type { GeneratedBatch, WeatherState } from "@/components/outfits/types";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";

export default function OutfitsPage() {
  const { showToast } = useToast();
  const profile = useQuery(api.users.getProfile);
  const wardrobeData = useQuery(api.wardrobe.list);
  const getWeather = useAction(api.weather.get);
  const saveLocation = useMutation(api.users.saveLocation);
  const generateOutfits = useAction(api.outfits.generate);
  const recordSwipe = useMutation(api.swipes.record);

  const [batch, setBatch] = useState<GeneratedBatch | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [selectedOccasion, setSelectedOccasion] = useState("Casual");
  const [weather, setWeather] = useState<WeatherState>({ condition: null, tempC: null });
  const [showContextOverride, setShowContextOverride] = useState(false);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showLocationSheet, setShowLocationSheet] = useState(false);
  const hasRequestedGeo = useRef(false);

  const fetchWeather = useCallback(async () => {
    try {
      const result = await getWeather({});
      setWeather({ condition: result.condition, tempC: result.tempC });
      setNeedsLocation(result.needsLocation);
    } catch {
      // weather failure is non-blocking
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Request browser geolocation then fetch weather — gated on profile being loaded
  // so Convex auth is ready before we call saveLocation.
  useEffect(() => {
    if (!profile || hasRequestedGeo.current) return;
    hasRequestedGeo.current = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await saveLocation({
              locationLat: pos.coords.latitude,
              locationLng: pos.coords.longitude,
            });
          } catch (err) {
            console.error("OutfitsPage: saveLocation failed", err);
          }
          fetchWeather();
        },
        (err) => {
          // code 1 = permission denied → show amber banner via fetchWeather
          // code 2/3 = position unavailable / timeout (user allowed but browser
          // can't resolve, e.g. desktop without GPS) → open LocationSheet so
          // they can enter a city without an extra tap
          if (err.code !== 1) {
            setShowLocationSheet(true);
          }
          fetchWeather();
        }
      );
    } else {
      fetchWeather();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const doGenerate = useCallback(
    async (occasion: string, forRefresh = false) => {
      if (isGenerating || isRefreshing) return;

      if (forRefresh) {
        setIsRefreshing(true);
        setRefreshError(false);
      } else {
        setIsGenerating(true);
        setGenerateError(false);
      }
      setSelectedOccasion(occasion);

      try {
        const result = await generateOutfits({
          occasion,
          weatherCondition: weather.condition,
          weatherTempC: weather.tempC,
          month: new Date().getMonth() + 1,
        });
        setBatch(result as GeneratedBatch);
      } catch (err) {
        console.error("OutfitsPage: generate failed", err);
        if (forRefresh) {
          setRefreshError(true);
        } else {
          setGenerateError(true);
        }
      } finally {
        if (forRefresh) {
          setIsRefreshing(false);
        } else {
          setIsGenerating(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isGenerating, isRefreshing, weather]
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (profile === undefined || profile === null || wardrobeData === undefined || wardrobeData === null) {
    return (
      <div data-testid="outfits-skeleton" className="px-4 pt-4 flex flex-col gap-3">
        {[420, 60, 60].map((h, i) => (
          <div key={i} className="bg-surface-container-high animate-pulse rounded-2xl" style={{ height: h }} />
        ))}
      </div>
    );
  }

  // ── No wardrobe items — State B ──────────────────────────────────────────
  if (!profile || (wardrobeData.items.length === 0 && !batch)) {
    return (
      <div data-testid="outfits-state-b" className="flex flex-col items-center justify-center px-6 pt-20 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M12 2L8 6H4l2 14h12L20 6h-4L12 2z" />
            <path d="M8 6c0 2.2 1.8 4 4 4s4-1.8 4-4" />
          </svg>
        </div>
        <h2 className="font-headline text-2xl text-on-surface">Add some clothes first</h2>
        <p className="text-[13px] text-on-surface-variant leading-relaxed">
          Upload a few wardrobe items and we can start styling outfits for you.
        </p>
        <Link
          href="/wardrobe"
          className="bg-primary text-on-primary rounded-full px-8 py-3 text-sm font-label tracking-wide font-medium active:scale-[0.98] transition-transform"
        >
          Go to Closet
        </Link>
      </div>
    );
  }

  // ── First-generate error ─────────────────────────────────────────────────
  if (generateError && !batch) {
    return (
      <div className="flex flex-col items-center px-6 pt-20 gap-4 text-center">
        <p className="font-headline text-2xl text-on-surface">Something went wrong</p>
        <button
          onClick={() => doGenerate(selectedOccasion)}
          className="border border-outline-variant bg-surface-container-lowest text-on-surface rounded-full px-6 py-3 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── First-generate loading skeleton ─────────────────────────────────────
  if (isGenerating) {
    return (
      <div className="px-4 pt-4 flex flex-col gap-3">
        {[420, 60, 60].map((h, i) => (
          <div key={i} className="bg-surface-container-high animate-pulse rounded-2xl" style={{ height: h }} />
        ))}
        <RotatingMessage messages={OUTFIT_LOADING_MESSAGES} />
      </div>
    );
  }

  const showBanner = needsLocation && !bannerDismissed;

  // ── Swipe deck (batch loaded) ────────────────────────────────────────────
  if (batch) {
    return (
      <>
        <SwipeStack
          batch={batch}
          isRefreshing={isRefreshing}
          refreshError={refreshError}
          occasion={selectedOccasion}
          weather={weather}
          onBatchExhausted={() => doGenerate(selectedOccasion, true)}
          onRetry={() => doGenerate(selectedOccasion, true)}
          onContextChange={() => setShowContextOverride(true)}
          onSwipe={(outfitId, liked) => {
            if (liked) showToast("Outfit saved");
            recordSwipe({ outfitId: outfitId as Id<"outfits">, liked }).catch((err) =>
              console.error("OutfitsPage: recordSwipe failed", err)
            );
          }}
        />
        <ContextOverrideSheet
          isOpen={showContextOverride}
          currentOccasion={selectedOccasion}
          onClose={() => setShowContextOverride(false)}
          onUpdate={(occ) => {
            setShowContextOverride(false);
            doGenerate(occ, true);
          }}
        />
      </>
    );
  }

  // ── Cold start / State A ─────────────────────────────────────────────────
  return (
    <div data-testid="outfits-state-a" className="px-6 pt-6">
      {showBanner && (
        <div className="bg-tertiary-container/50 border border-tertiary-container rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-on-tertiary-container flex-shrink-0 mt-0.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-tertiary-container">Add your location</p>
            <p className="text-xs text-on-tertiary-container/80 mt-0.5">
              We&apos;ll use it to show accurate weather for your outfits.
            </p>
            <button
              onClick={() => setShowLocationSheet(true)}
              className="text-xs font-medium text-primary mt-1"
            >
              Set location
            </button>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-on-tertiary-container/60 text-lg leading-none flex-shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl tracking-tight text-on-background">Today&apos;s outfits</h1>
        {weather.tempC !== null && (
          <ContextPill occasion={selectedOccasion} weather={weather} onTap={() => {}} />
        )}
      </div>
      <p className="text-[13px] text-on-surface-variant mt-1">
        Choose an occasion to get your first outfit ideas
      </p>
      <div className="mt-4">
        <ColdStartPicker
          onGenerate={(occ) => doGenerate(occ)}
          isGenerating={isGenerating}
          totalSwipes={profile.totalSwipes}
        />
      </div>

      {showLocationSheet && (
        <LocationSheet
          onClose={() => setShowLocationSheet(false)}
          onSaved={() => {
            setShowLocationSheet(false);
            setBannerDismissed(true);
            fetchWeather();
          }}
        />
      )}
    </div>
  );
}
