"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";

function getOccasionBadgeClass(occasion: string): string {
  const lower = occasion.toLowerCase();
  if (lower.includes("work") || lower.includes("smart")) return "bg-secondary-container text-on-secondary-container";
  if (lower.includes("date") || lower.includes("evening")) return "bg-tertiary-container text-on-tertiary-container";
  if (lower.includes("gym") || lower.includes("sport")) return "bg-error-container text-on-error-container";
  return "bg-primary-container text-on-primary-container";
}

type SavedOutfit = NonNullable<ReturnType<typeof useQuery<typeof api.outfits.listSaved>>>[number];
type ItemEntry = { name: string; dominantColourHex: string; imageUrl: string };

function SavedOutfitRow({
  outfit,
  itemMap,
  isExpanded,
  onToggle,
  onMarkWorn,
  onDelete,
}: {
  outfit: SavedOutfit;
  itemMap: Map<string, ItemEntry>;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkWorn: (outfitId: Id<"outfits">) => void;
  onDelete: (outfitId: Id<"outfits">) => void;
}) {
  const heroItem = itemMap.get(String(outfit.heroItemId));
  const heroImage = heroItem?.imageUrl ?? null;

  const wornCount = outfit.wornOn.length;
  const wornDates = outfit.wornOn
    .slice()
    .sort()
    .reverse()
    .slice(0, 5)
    .map((d) =>
      new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    )
    .join(" · ");

  const allItems = outfit.itemIds
    .map((id) => itemMap.get(String(id)))
    .filter(Boolean) as ItemEntry[];

  // 2-col editorial grid: left = first item aspect-[3/4], right = up to 2 items stacked aspect-square
  const leftItem = allItems[0];
  const rightItems = allItems.slice(1, 3);

  return (
    <div
      className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(100,87,131,0.08)]"
      data-testid={`saved-outfit-${outfit._id}`}
    >
      {/* Accordion header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={isExpanded}
      >
        {/* Hero thumbnail */}
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-container flex-shrink-0">
          {heroImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroImage}
              alt={heroItem?.name ?? "Outfit"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ backgroundColor: (heroItem?.dominantColourHex ?? "#e2e8f0") + "40" }}
              data-testid="outfit-hero-swatch"
              data-colour={heroItem?.dominantColourHex ?? "#e2e8f0"}
            />
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-label tracking-widest uppercase px-2.5 py-1 rounded-full ${getOccasionBadgeClass(outfit.occasion)}`}
            >
              {outfit.occasion}
            </span>
            {wornCount > 0 && (
              <span className="text-[11px] text-on-surface-variant">
                Worn {wornCount}×
              </span>
            )}
          </div>
          <p className="font-headline text-base leading-tight text-on-surface truncate">
            {heroItem?.name ?? "Outfit"}
          </p>
        </div>

        {/* Chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`text-on-surface-variant flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-surface-container px-4 pb-4 pt-3 space-y-4">
          {/* 2-col editorial item grid */}
          {allItems.length > 0 && (
            <div className="flex gap-2 h-44">
              {/* Left — tall portrait */}
              {leftItem && (
                <div className="flex-1 rounded-lg overflow-hidden bg-surface-container">
                  {leftItem.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={leftItem.imageUrl}
                      alt={leftItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ backgroundColor: leftItem.dominantColourHex + "40" }}
                    />
                  )}
                </div>
              )}
              {/* Right — two stacked squares */}
              {rightItems.length > 0 && (
                <div className="flex flex-col gap-2 w-[45%]">
                  {rightItems.map((item, i) => (
                    <div key={i} className="flex-1 rounded-lg overflow-hidden bg-surface-container">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: item.dominantColourHex + "40" }}
                        />
                      )}
                    </div>
                  ))}
                  {/* Fill empty slot if only 1 right item */}
                  {rightItems.length === 1 && allItems.length > 3 && (
                    <div className="flex-1 rounded-lg overflow-hidden bg-surface-container">
                      {allItems[3].imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={allItems[3].imageUrl}
                          alt={allItems[3].name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full"
                          style={{ backgroundColor: allItems[3].dominantColourHex + "40" }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Worn dates */}
          {wornCount > 0 && (
            <p className="text-[11px] text-on-surface-variant">
              Worn: {wornDates}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkWorn(outfit._id);
              }}
              className="flex-1 bg-primary text-on-primary rounded-full py-3 text-[13px] font-label tracking-wide font-medium active:scale-[0.98] transition-transform"
              data-testid={`mark-worn-${outfit._id}`}
            >
              Mark as worn today
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(outfit._id);
              }}
              className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-error active:scale-[0.98] transition-transform"
              data-testid={`delete-outfit-${outfit._id}`}
              aria-label="Remove outfit"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SavedPage() {
  const savedOutfits = useQuery(api.outfits.listSaved);
  const wardrobeData = useQuery(api.wardrobe.list);
  const markWornMutation = useMutation(api.outfits.markWorn);
  const unsaveMutation = useMutation(api.outfits.unsave);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [wornError, setWornError] = useState<string | null>(null);

  if (savedOutfits === undefined || savedOutfits === null || wardrobeData === undefined) {
    return (
      <div className="px-4 pt-6 space-y-3" data-testid="saved-skeleton">
        <div className="bg-surface-container-high animate-pulse rounded-xl h-20" />
        <div className="bg-surface-container-high animate-pulse rounded-xl h-20" />
        <div className="bg-surface-container-high animate-pulse rounded-xl h-20" />
      </div>
    );
  }

  const itemMap = new Map<string, ItemEntry>(
    (wardrobeData?.items ?? []).map((item) => [
      String(item._id),
      {
        name: item.name,
        dominantColourHex: item.dominantColourHex,
        imageUrl: item.imageUrl as string,
      },
    ])
  );

  const handleMarkWorn = async (outfitId: Id<"outfits">) => {
    try {
      await markWornMutation({ outfitId });
    } catch {
      setWornError("Couldn't mark as worn — try again");
      setTimeout(() => setWornError(null), 3000);
    }
  };

  const handleDelete = async (outfitId: Id<"outfits">) => {
    try {
      setExpandedId(null);
      await unsaveMutation({ outfitId });
    } catch {
      setWornError("Couldn't remove outfit — try again");
      setTimeout(() => setWornError(null), 3000);
    }
  };

  // Empty state
  if (savedOutfits.length === 0) {
    return (
      <div
        className="px-4 pt-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center"
        data-testid="saved-empty-state"
      >
        <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-primary">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <h2 className="font-headline text-2xl text-on-surface">No saved outfits yet</h2>
        <p className="text-[13px] text-on-surface-variant leading-relaxed max-w-xs">
          Swipe right on outfits you love to save them here
        </p>
        <Link
          href="/outfits"
          className="bg-primary text-on-primary rounded-full px-8 py-3 text-sm font-label tracking-wide font-medium active:scale-[0.98] transition-transform"
        >
          Go to Outfits
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-6" data-testid="saved-list">
      <h1 className="font-headline text-3xl tracking-tight text-on-background mb-6">Saved</h1>

      {wornError && (
        <div className="mb-3 p-3 bg-error-container rounded-xl text-sm text-on-error-container">
          {wornError}
        </div>
      )}

      <div className="space-y-3">
        {savedOutfits.map((outfit) => (
          <SavedOutfitRow
            key={String(outfit._id)}
            outfit={outfit}
            itemMap={itemMap}
            isExpanded={expandedId === String(outfit._id)}
            onToggle={() =>
              setExpandedId((prev) =>
                prev === String(outfit._id) ? null : String(outfit._id)
              )
            }
            onMarkWorn={handleMarkWorn}
            onDelete={handleDelete}
          />
        ))}

        {/* Prompt card */}
        <div className="flex items-center justify-center h-16 rounded-xl border-2 border-dashed border-surface-container-high mt-1">
          <p className="text-[13px] text-on-surface-variant">Swipe right to save more outfits</p>
        </div>
      </div>
    </div>
  );
}
