"use client";

import type { GeneratedOutfit } from "./types";

interface OutfitSwipeCardProps {
  outfit: GeneratedOutfit;
  infoExpanded?: boolean;
  onInfoToggle?: () => void;
}

export default function OutfitSwipeCard({
  outfit,
  infoExpanded = false,
  onInfoToggle,
}: OutfitSwipeCardProps) {
  const heroItem =
    outfit.items.find((i) => i._id === outfit.heroItemId) ?? outfit.items[0];
  const heroImage = heroItem?.imageUrl ?? null;

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-[0_32px_64px_-16px_rgba(100,87,131,0.15)] overflow-hidden flex flex-col h-full">
      {/* Hero image — top 2/3 */}
      <div className="relative flex-[2] overflow-hidden bg-surface-container">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={heroItem?.name ?? "Outfit"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-surface-container" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Occasion badge + outfit title */}
        <div className="absolute bottom-4 left-4 right-4">
          <span className="bg-primary/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-label tracking-widest uppercase mb-2 inline-block capitalize">
            {outfit.occasion}
          </span>
          <h3 className="font-headline text-white text-2xl leading-tight">
            {heroItem?.name ?? "Outfit"}
          </h3>
        </div>
      </div>

      {/* Item thumbnails + optional reasoning — bottom third */}
      <div className="flex-1 p-4 flex flex-col justify-center gap-3">
        {/* Thumbnail scroll row */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          {outfit.items.map((item) => (
            <div
              key={item._id}
              className="flex-shrink-0 w-16 h-16 rounded-lg bg-surface-container overflow-hidden"
            >
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
        </div>

        {/* Reasoning — shown when info expanded */}
        {infoExpanded && (
          <p className="text-[13px] text-on-surface-variant italic leading-relaxed">
            {outfit.reasoning}
          </p>
        )}
      </div>
    </div>
  );
}
