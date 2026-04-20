"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import WardrobeGrid from "@/components/wardrobe/WardrobeGrid";
import ItemUploader from "@/components/wardrobe/ItemUploader";
import ItemDetailSheet from "@/components/wardrobe/ItemDetailSheet";
import { useToast } from "@/components/ToastProvider";

interface WardrobeItem {
  _id: Id<"wardrobeItems">;
  imageUrl: string;
  name: string;
  category: string;
  colours: string[];
  tags: string[];
  seasonTags: string[];
  dominantColourHex: string;
}

export default function WardrobePage() {
  const { showToast } = useToast();
  const result = useQuery(api.wardrobe.list);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const [isRetagging, setIsRetagging] = useState(false);
  const retagAll = useAction(api.wardrobeUpload.retagAll);

  const isLoading = result === undefined;
  const items = (result?.items ?? []) as WardrobeItem[];

  async function handleRetagAll() {
    setIsRetagging(true);
    try {
      const { retagged, failed } = await retagAll({});
      if (failed > 0) {
        showToast(`Re-tagged ${retagged} items, ${failed} failed`);
      } else {
        showToast(`Re-tagged ${retagged} item${retagged !== 1 ? "s" : ""}`);
      }
    } catch {
      showToast("Re-tagging failed — try again");
    } finally {
      setIsRetagging(false);
    }
  }

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="px-4 pt-4 pb-2 flex items-baseline gap-2">
        <h2 className="font-headline text-3xl tracking-tight text-on-background">My Closet</h2>
        {!isLoading && (
          <span className="text-on-surface-variant font-normal text-sm">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        )}
        {!isLoading && items.length > 0 && (
          <button
            onClick={handleRetagAll}
            disabled={isRetagging}
            className="ml-auto text-xs text-primary disabled:text-on-surface-variant"
          >
            {isRetagging ? "Re-tagging…" : "Re-tag all"}
          </button>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div data-testid="wardrobe-skeleton" className="grid grid-cols-3 gap-2 p-2 mt-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] bg-surface-container-high animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <rect x="2" y="3" width="20" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
              <path d="M7 8h2m-2 4h2m7-4h2m-2 4h2" />
            </svg>
          </div>
          <div>
            <p className="font-headline text-2xl text-on-surface">Your closet is empty</p>
            <p className="text-on-surface-variant text-sm mt-1">
              Add your first item to get outfit suggestions.
            </p>
          </div>
        </div>
      )}

      {/* Filled state */}
      {!isLoading && items.length > 0 && (
        <WardrobeGrid items={items} onItemTap={(item) => setSelectedItem(item)} />
      )}

      {/* Floating upload button + overlay */}
      <ItemUploader onSuccess={() => showToast("Item uploaded")} />

      {/* Item detail sheet */}
      <ItemDetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}
