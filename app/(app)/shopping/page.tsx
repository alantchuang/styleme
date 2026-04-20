"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { SHOPPING_EMPTY_STATE_THRESHOLD, SHOPPING_LOADING_STEPS } from "@/lib/constants";

type Gap = NonNullable<ReturnType<typeof useQuery<typeof api.shopping.list>>>["gaps"][number];

function priorityLabel(priority: string): string {
  if (priority === "high") return "High Priority";
  if (priority === "medium") return "Core Essential";
  return "Seasonal Update";
}

function priorityBadgeClass(priority: string): string {
  if (priority === "high") return "bg-error-container text-on-error-container";
  if (priority === "medium") return "bg-secondary-container text-on-secondary-container";
  return "bg-tertiary-container text-on-tertiary-container";
}

function GapCard({ gap }: { gap: Gap }) {
  const isHigh = gap.priority === "high";

  // Fall back to color gradient if no Pexels image stored yet
  const swatchColors = gap.compatibleItems.slice(0, 3).map((i) => i.dominantColourHex);
  const fallbackStyle =
    swatchColors.length >= 2
      ? { background: `linear-gradient(135deg, ${swatchColors.join(", ")})` }
      : swatchColors.length === 1
        ? { backgroundColor: swatchColors[0] }
        : { backgroundColor: "#eadeff" };

  return (
    <Link
      href={`/shopping/${gap._id}`}
      className="block bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(100,87,131,0.08)]"
      data-testid={`gap-card-${gap._id}`}
      data-priority={gap.priority}
    >
      {/* Hero image — aspect-square */}
      <div
        className="relative w-full aspect-square overflow-hidden"
        style={gap.imageUrl ? {} : fallbackStyle}
      >
        {gap.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gap.imageUrl}
            alt={gap.itemName}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {!gap.imageUrl && swatchColors.length === 0 && (
          <div className="absolute inset-0 bg-primary-container" />
        )}

        {/* Priority badge overlay */}
        <div className="absolute top-3 left-3">
          <span
            className={`text-[10px] font-label tracking-widest uppercase px-3 py-1.5 rounded-full backdrop-blur-sm ${priorityBadgeClass(gap.priority)}`}
          >
            {priorityLabel(gap.priority)}
          </span>
        </div>

        {/* Item name overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4">
          <h3 className="font-headline text-white text-2xl leading-tight">{gap.itemName}</h3>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        <p className="text-[13px] text-on-surface-variant leading-relaxed">{gap.reason}</p>

        {gap.affectedOccasions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {gap.affectedOccasions.map((occ) => (
              <span
                key={occ}
                className="text-[11px] bg-surface-container text-on-surface-variant rounded-full px-2.5 py-1"
              >
                {occ}
              </span>
            ))}
          </div>
        )}

        {gap.compatibleItems.length > 0 && (
          <div className="flex gap-1.5 items-center">
            <span className="text-[11px] text-on-surface-variant mr-0.5">Works with</span>
            {gap.compatibleItems.slice(0, 4).map((item) => (
              <div
                key={String(item._id)}
                className="w-5 h-5 rounded-full border-2 border-surface-container-lowest shadow-sm flex-shrink-0"
                style={{ backgroundColor: item.dominantColourHex }}
                title={item.name}
                data-testid="compatible-swatch"
                data-colour={item.dominantColourHex}
              />
            ))}
          </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            const url = `https://www.google.com/search?q=${encodeURIComponent(gap.searchQuery)}&tbm=shop`;
            window.open(url, "_blank", "noopener,noreferrer");
          }}
          className={`w-full rounded-full py-3 text-sm font-label tracking-wide font-medium active:scale-[0.98] transition-transform ${
            isHigh
              ? "bg-primary text-on-primary"
              : "border border-outline-variant bg-surface-container-lowest text-on-surface"
          }`}
          data-testid={`gap-cta-${gap._id}`}
          data-search-query={gap.searchQuery}
        >
          Find on Google Shopping
        </button>
      </div>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="px-4 pt-6 space-y-3" data-testid="shopping-skeleton">
      <div className="bg-surface-container-high animate-pulse rounded-xl h-48" />
      <div className="bg-surface-container-high animate-pulse rounded-xl h-40" />
      <div className="bg-surface-container-high animate-pulse rounded-xl h-40" />
    </div>
  );
}

export default function ShoppingPage() {
  const shoppingData = useQuery(api.shopping.list);
  const profile = useQuery(api.users.getProfile);
  const wardrobeData = useQuery(api.wardrobe.list);
  const regenerate = useAction(api.shopping.regenerate);

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [activeStep, setActiveStep] = useState(0);
  const hasTriggeredRegen = useRef(false);

  // Thinking steps cycle during regeneration
  useEffect(() => {
    if (!isRegenerating) {
      setActiveStep(0);
      return;
    }
    const timer = setInterval(() => {
      setActiveStep((s) => (s + 1) % SHOPPING_LOADING_STEPS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [isRegenerating]);

  // Auto-trigger regeneration when stale
  useEffect(() => {
    if (shoppingData?.isStale && !isRegenerating && !hasTriggeredRegen.current) {
      hasTriggeredRegen.current = true;
      setIsRegenerating(true);
      setRegenError(false);
      regenerate({})
        .catch(() => setRegenError(true))
        .finally(() => {
          setIsRegenerating(false);
          hasTriggeredRegen.current = false;
        });
    }
    if (!shoppingData?.isStale) {
      hasTriggeredRegen.current = false;
    }
  }, [shoppingData?.isStale, isRegenerating, regenerate]);

  if (shoppingData === undefined || shoppingData === null || profile === undefined || profile === null) {
    return <LoadingSkeleton />;
  }

  const totalSwipes = profile?.totalSwipes ?? 0;

  // Empty state: not enough swipes
  if (totalSwipes < SHOPPING_EMPTY_STATE_THRESHOLD) {
    return (
      <div
        className="px-4 pt-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center"
        data-testid="shopping-empty-state"
      >
        <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>
        <h2 className="font-headline text-2xl text-on-surface">Not enough data yet</h2>
        <p className="text-[13px] text-on-surface-variant leading-relaxed max-w-xs">
          Swipe through a few outfit ideas first — the AI will start spotting your wardrobe gaps.
        </p>

        <div className="w-full max-w-xs">
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-primary rounded-full transition-all"
              style={{
                width: `${Math.min(100, (totalSwipes / SHOPPING_EMPTY_STATE_THRESHOLD) * 100)}%`,
              }}
              data-testid="swipe-progress-bar"
            />
          </div>
          <p className="text-[11px] text-on-surface-variant text-center mt-1.5">
            {totalSwipes} / {SHOPPING_EMPTY_STATE_THRESHOLD} swipes
          </p>
        </div>

        <Link
          href="/outfits"
          className="bg-primary text-on-primary rounded-full px-8 py-3 text-sm font-label tracking-wide font-medium active:scale-[0.98] transition-transform"
        >
          Go to Outfits
        </Link>
      </div>
    );
  }

  const gaps = shoppingData.gaps;

  // No gaps found (and not regenerating)
  if (gaps.length === 0 && !isRegenerating) {
    return (
      <div
        className="px-4 pt-6 flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center"
        data-testid="shopping-no-gaps"
      >
        <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-primary">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="font-headline text-2xl text-on-surface">Your wardrobe looks well-rounded!</p>
        <p className="text-[13px] text-on-surface-variant">Keep swiping to refine recommendations.</p>
      </div>
    );
  }

  // Regenerating — show thinking steps, hide snapshot/filters/cards
  if (isRegenerating) {
    return (
      <div className="px-4 pt-8 pb-6" data-testid="shopping-active-state">
        <div className="space-y-3" data-testid="shopping-thinking-steps">
          {SHOPPING_LOADING_STEPS.slice(0, activeStep + 1).map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`font-medium ${i < activeStep ? "text-primary" : "text-on-surface"}`}>
                {i < activeStep ? "✓" : "▸"}
              </span>
              <span className="text-[13px] text-on-surface-variant">{text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const occasions = [...new Set(gaps.flatMap((g) => g.affectedOccasions))];
  const filteredGaps = gaps.filter((gap) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "high") return gap.priority === "high";
    return gap.affectedOccasions.includes(activeFilter);
  });

  const mostRecentCreationTime =
    gaps.length > 0 ? Math.max(...gaps.map((g) => g._creationTime)) : null;

  return (
    <div className="pb-6" data-testid="shopping-active-state">
      {/* WardrobeSnapshot bar */}
      <div
        className="bg-surface-container px-4 py-3 flex items-center justify-between"
        data-testid="wardrobe-snapshot"
      >
        <div className="flex gap-6">
          <div className="text-center">
            <div className="font-headline text-xl text-primary" data-testid="gaps-count">
              {gaps.length}
            </div>
            <div className="text-[11px] text-on-surface-variant">Gaps found</div>
          </div>
          <div className="text-center">
            <div className="font-headline text-xl text-on-surface">{occasions.length}</div>
            <div className="text-[11px] text-on-surface-variant">Occasions</div>
          </div>
          <div className="text-center">
            <div className="font-headline text-xl text-on-surface">
              {wardrobeData?.total ?? 0}
            </div>
            <div className="text-[11px] text-on-surface-variant">Items</div>
          </div>
        </div>

        {mostRecentCreationTime && (
          <span className="text-[11px] text-on-surface-variant" data-testid="updated-timestamp">
            Updated {formatDistanceToNow(mostRecentCreationTime)} ago
          </span>
        )}
      </div>

      {/* Filter pills */}
      <div className="sticky top-[72px] z-40 bg-background/80 backdrop-blur-md overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-4 py-3 min-w-max" data-testid="filter-pills">
          {(["all", "high", ...occasions] as string[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              data-testid={filter === "high" ? "filter-high-priority" : `filter-${filter.toLowerCase().replace(/\s+/g, "-")}`}
              className={`px-5 py-2 rounded-full font-label text-[11px] tracking-widest whitespace-nowrap transition-colors ${
                filter === activeFilter
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              {filter === "all" ? "ALL" : filter === "high" ? "HIGH PRIORITY" : filter.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {regenError && (
        <div className="mx-4 mb-3 p-3 bg-error-container rounded-xl text-sm text-on-error-container">
          Couldn&apos;t refresh your recommendations
        </div>
      )}

      {/* Gap cards */}
      <div className="px-4 pt-4 space-y-4">
        {filteredGaps.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant text-center py-8">
            No gaps match this filter.
          </p>
        ) : (
          filteredGaps.map((gap) => (
            <GapCard key={String(gap._id)} gap={gap} />
          ))
        )}
      </div>
    </div>
  );
}
