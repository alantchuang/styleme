"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import OutfitSwipeCard from "./OutfitSwipeCard";
import ContextPill from "./ContextPill";
import RotatingMessage from "./RotatingMessage";
import { OUTFIT_LOADING_MESSAGES } from "@/lib/constants";
import type { GeneratedBatch, GeneratedOutfit, WeatherState } from "./types";

const SWIPE_THRESHOLD = 80; // px
const FLY_DISTANCE = 600; // px

interface SwipeStackProps {
  batch: GeneratedBatch;
  isRefreshing: boolean;
  refreshError: boolean;
  occasion: string;
  weather: WeatherState;
  onBatchExhausted: () => void;
  onRetry: () => void;
  onContextChange: () => void;
  onSwipe?: (outfitId: string, liked: boolean) => void;
}

export default function SwipeStack({
  batch,
  isRefreshing,
  refreshError,
  occasion,
  weather,
  onBatchExhausted,
  onRetry,
  onContextChange,
  onSwipe,
}: SwipeStackProps) {
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const isSwipingRef = useRef(false); // ref guard — survives re-renders without stale closure
  const [infoExpanded, setInfoExpanded] = useState(false);

  // Reset when a new batch arrives
  const prevBatchId = useRef(batch.batchId);
  useEffect(() => {
    if (batch.batchId !== prevBatchId.current) {
      prevBatchId.current = batch.batchId;
      setSwipeIndex(0);
      setInfoExpanded(false);
      springApi.set({ x: 0, rotate: 0, opacity: 1 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.batchId]);

  const [{ x, rotate, opacity }, springApi] = useSpring(() => ({
    x: 0,
    rotate: 0,
    opacity: 1,
    config: { tension: 300, friction: 30 },
  }));

  const doSwipe = useCallback(
    (liked: boolean) => {
      if (isSwipingRef.current) return;
      isSwipingRef.current = true;
      setIsSwiping(true);

      // Record swipe fire-and-forget — ref guard prevents duplicates
      const outfitId = batch.outfits[swipeIndex]?._id;
      if (outfitId) onSwipe?.(outfitId, liked);

      const nextIndex = swipeIndex + 1;

      // Safety timeout — if onRest never fires (e.g. component re-renders mid-flight
      // cause react-spring to drop the callback), force-reset after animation duration.
      const safetyTimer = setTimeout(() => {
        if (!isSwipingRef.current) return;
        isSwipingRef.current = false;
        setIsSwiping(false);
        springApi.set({ x: 0, rotate: 0, opacity: 1 });
        setSwipeIndex(nextIndex);
        if (nextIndex >= batch.outfits.length) {
          onBatchExhausted();
        }
      }, 800);

      springApi.start({
        x: liked ? FLY_DISTANCE : -FLY_DISTANCE,
        rotate: liked ? 15 : -15,
        opacity: 0,
        onRest: () => {
          clearTimeout(safetyTimer);
          if (!isSwipingRef.current) return; // safety timer already fired
          isSwipingRef.current = false;
          springApi.set({ x: 0, rotate: 0, opacity: 1 });
          setInfoExpanded(false);
          setSwipeIndex(nextIndex);
          if (nextIndex >= batch.outfits.length) {
            onBatchExhausted();
          }
          setIsSwiping(false);
        },
      });
    },
    [springApi, batch.outfits, swipeIndex, onBatchExhausted, onSwipe]
  );

  const bind = useDrag(
    ({ active, movement: [mx], velocity: [vx] }) => {
      if (isSwipingRef.current || isRefreshing) return;
      if (!active) {
        if (Math.abs(mx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.5) {
          doSwipe(mx > 0);
        } else {
          springApi.start({ x: 0, rotate: 0, opacity: 1 });
        }
      } else {
        springApi.start({ x: mx, rotate: mx * 0.05, opacity: 1, immediate: true });
      }
    },
    { filterTaps: true }
  );

  // Overlay opacities derived from x spring
  const likeOpacity = x.to((v) => Math.max(0, Math.min(1, v / 150)));
  const dislikeOpacity = x.to((v) => Math.max(0, Math.min(1, -v / 150)));

  // Batch transition — skeleton state
  if (isRefreshing) {
    return (
      <div className="flex flex-col items-stretch px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-headline text-3xl tracking-tight text-on-background">Today&apos;s outfits</h1>
        </div>
        <div className="relative" style={{ height: 540 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-0 bg-surface-container-high animate-pulse rounded-xl"
              style={{
                transform: `translateY(${i * 12}px) scale(${1 - i * 0.04})`,
                opacity: 1 - i * 0.25,
                zIndex: 3 - i,
              }}
            />
          ))}
        </div>
        <RotatingMessage messages={OUTFIT_LOADING_MESSAGES} />
      </div>
    );
  }

  // Error state
  if (refreshError) {
    return (
      <div className="flex flex-col items-center px-4 pt-16 gap-4">
        <p className="font-headline text-2xl text-on-surface">Couldn&apos;t load new outfits</p>
        <button
          onClick={onRetry}
          className="border border-outline-variant bg-surface-container-lowest text-on-surface rounded-full px-6 py-3 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  const currentOutfit: GeneratedOutfit | undefined = batch.outfits[swipeIndex];
  const nextOutfit: GeneratedOutfit | undefined = batch.outfits[swipeIndex + 1];
  const thirdOutfit: GeneratedOutfit | undefined = batch.outfits[swipeIndex + 2];

  if (!currentOutfit) return null;

  const progressDots = batch.outfits.map((_, i) => i);

  return (
    <div className="flex flex-col px-4 pb-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-headline text-3xl tracking-tight text-on-background">
            Today&apos;s outfits
          </h1>
          {/* Weather pill — informational only */}
          {weather.tempC !== null && (
            <div className="bg-secondary-container/50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-on-surface-variant">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-semibold">
                {weather.condition ?? ""} {weather.tempC}°C
              </span>
            </div>
          )}
        </div>
        {/* Context pill / occasion override */}
        <div className="flex items-center gap-2">
          <ContextPill occasion={occasion} weather={weather} onTap={onContextChange} />
        </div>
      </div>

      {/* Card stack */}
      <div className="relative" style={{ height: 540 }}>
        {/* Back cards (non-interactive) */}
        {thirdOutfit && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: "translateY(16px) scale(0.92)", opacity: 0.4, filter: "blur(2px)", zIndex: 1 }}
          >
            <OutfitSwipeCard outfit={thirdOutfit} />
          </div>
        )}
        {nextOutfit && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: "translateY(8px) scale(0.96)", opacity: 0.75, filter: "blur(1px)", zIndex: 2 }}
          >
            <OutfitSwipeCard outfit={nextOutfit} />
          </div>
        )}

        {/* Top card — animated and interactive */}
        <animated.div
          {...bind()}
          style={{ x, rotate, opacity, touchAction: "none" }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ style: { x, rotate, opacity, touchAction: "none" } } as any)}
        >
          <div className="relative h-full" style={{ zIndex: 3 }}>
            <OutfitSwipeCard
              outfit={currentOutfit}
              infoExpanded={infoExpanded}
              onInfoToggle={() => setInfoExpanded((v) => !v)}
            />
            {/* Like overlay */}
            <animated.div
              className="absolute inset-0 rounded-xl bg-primary/10 flex items-center justify-center pointer-events-none"
              style={{ opacity: likeOpacity }}
            >
              <span className="text-primary text-6xl">♥</span>
            </animated.div>
            {/* Dislike overlay */}
            <animated.div
              className="absolute inset-0 rounded-xl bg-error/10 flex items-center justify-center pointer-events-none"
              style={{ opacity: dislikeOpacity }}
            >
              <span className="text-error text-6xl">✕</span>
            </animated.div>
          </div>
        </animated.div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center items-center gap-1.5 mt-4">
        {progressDots.map((i) => (
          <div
            key={i}
            className={
              i === swipeIndex
                ? "w-4 h-1.5 rounded-full bg-primary"
                : "w-1.5 h-1.5 rounded-full bg-outline-variant"
            }
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center items-center gap-8 mt-6">
        <button
          onClick={() => doSwipe(false)}
          disabled={isSwiping}
          aria-label="Discard outfit"
          className="w-14 h-14 rounded-full bg-surface-container-lowest text-error flex items-center justify-center shadow-lg active:scale-90 transition-transform disabled:opacity-50"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => setInfoExpanded((v) => !v)}
          aria-label={infoExpanded ? "Hide outfit details" : "Show outfit details"}
          className="w-12 h-12 rounded-full bg-surface-container-lowest text-on-surface-variant flex items-center justify-center shadow-md active:scale-90 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
        <button
          onClick={() => doSwipe(true)}
          disabled={isSwiping}
          aria-label="Save outfit"
          className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-[0_12px_24px_rgba(100,87,131,0.3)] active:scale-90 transition-transform disabled:opacity-50"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
