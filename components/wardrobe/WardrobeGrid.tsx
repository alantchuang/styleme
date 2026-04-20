"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

type Category =
  | "all"
  | "tops"
  | "bottoms"
  | "shoes"
  | "outerwear"
  | "accessories"
  | "dresses"
  | "bags";

const FILTER_PILLS: { label: string; value: Category }[] = [
  { label: "ALL", value: "all" },
  { label: "TOPS", value: "tops" },
  { label: "BOTTOMS", value: "bottoms" },
  { label: "SHOES", value: "shoes" },
  { label: "OUTERWEAR", value: "outerwear" },
  { label: "DRESSES", value: "dresses" },
  { label: "ACCESSORIES", value: "accessories" },
  { label: "BAGS", value: "bags" },
];

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

interface WardrobeGridProps {
  items: WardrobeItem[];
  onItemTap: (item: WardrobeItem) => void;
}

export default function WardrobeGrid({ items, onItemTap }: WardrobeGridProps) {
  const [activeFilter, setActiveFilter] = useState<Category>("all");

  const filtered =
    activeFilter === "all"
      ? items
      : items.filter((item) => item.category === activeFilter);

  // Split into left (even indices) and right (odd indices) columns for asymmetric stagger
  const leftCol = filtered.filter((_, i) => i % 2 === 0);
  const rightCol = filtered.filter((_, i) => i % 2 === 1);

  return (
    <div>
      {/* Sticky filter row */}
      <div className="sticky top-[72px] z-40 bg-background/80 backdrop-blur-md overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-4 py-3 min-w-max">
          {FILTER_PILLS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={`px-5 py-2 rounded-full font-label text-[11px] tracking-widest whitespace-nowrap transition-colors ${
                activeFilter === value
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Asymmetric 2-column grid */}
      <div className="grid grid-cols-2 gap-x-5 px-5 pt-6 pb-4">
        {/* Left column */}
        <div className="flex flex-col gap-10">
          {leftCol.map((item) => (
            <WardrobeItemTile key={item._id} item={item} onTap={onItemTap} />
          ))}
        </div>

        {/* Right column — staggered down */}
        <div className="flex flex-col gap-10 pt-8">
          {rightCol.map((item, i) => (
            <div key={item._id} className={i === 1 ? "pt-4" : ""}>
              <WardrobeItemTile item={item} onTap={onItemTap} />
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && activeFilter !== "all" && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <p className="text-on-surface-variant text-sm">No {activeFilter} yet.</p>
        </div>
      )}
    </div>
  );
}

function WardrobeItemTile({
  item,
  onTap,
}: {
  item: WardrobeItem;
  onTap: (item: WardrobeItem) => void;
}) {
  const isAllSeason = item.seasonTags.includes("all-season");

  return (
    <button className="group cursor-pointer text-left w-full" onClick={() => onTap(item)}>
      <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-surface-container-low">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Season dot */}
        <span
          className={`absolute top-3 right-3 w-3 h-3 rounded-full border border-white/60 shadow-sm ${
            isAllSeason ? "bg-green-400" : "bg-amber-400"
          }`}
          aria-label={isAllSeason ? "All season" : "Seasonal"}
        />
      </div>

      {/* Category label */}
      <p className="font-label text-[10px] tracking-widest text-secondary uppercase mt-3 mb-1 truncate">
        {item.category}
      </p>

      {/* Item name */}
      <h3 className="font-headline text-lg leading-tight text-on-surface line-clamp-2">
        {item.name}
      </h3>
    </button>
  );
}
