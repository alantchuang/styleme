"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";

function PriorityBadge({ priority }: { priority: string }) {
  const classes =
    priority === "high"
      ? "bg-red-50 text-red-700"
      : priority === "medium"
        ? "bg-amber-50 text-amber-700"
        : "bg-green-50 text-green-700";
  const label = priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low";
  return (
    <span className={`${classes} text-xs font-medium px-2.5 py-1 rounded-full`}>{label}</span>
  );
}

function SeasonBadge({ season }: { season: string }) {
  const label =
    season === "current" ? "In season" : season === "upcoming" ? "Coming up" : "Off season";
  const classes =
    season === "current"
      ? "bg-green-50 text-green-700"
      : season === "upcoming"
        ? "bg-blue-50 text-blue-700"
        : "bg-slate-100 text-slate-500";
  return (
    <span className={`${classes} text-xs font-medium px-2.5 py-1 rounded-full`}>{label}</span>
  );
}

export default function GapDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gapId = params.gapId as Id<"shoppingGaps">;

  const gap = useQuery(api.shopping.getGap, { gapId });
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (gap === undefined) {
    return (
      <div className="p-4 space-y-3">
        <div className="bg-slate-100 animate-pulse rounded-2xl h-40" />
        <div className="bg-slate-100 animate-pulse rounded-2xl h-24" />
        <div className="bg-slate-100 animate-pulse rounded-2xl h-32" />
      </div>
    );
  }

  if (gap === null) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">Gap not found.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-violet-700 text-sm font-medium"
        >
          Go back
        </button>
      </div>
    );
  }

  const activeQuery = searchQuery ?? gap.searchQuery;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenShopping = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(activeQuery)}&tbm=shop`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="pb-8">
      {/* Back button */}
      <div className="px-4 pt-2 pb-1">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-600 py-2"
          aria-label="Back"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Shopping
        </button>
      </div>

      <div className="px-4 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-lg font-medium text-slate-900 mb-2">{gap.itemName}</h1>
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={gap.priority} />
            <SeasonBadge season={gap.seasonRelevance} />
            {gap.affectedOccasions.map((occ) => (
              <span
                key={occ}
                className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {occ}
              </span>
            ))}
          </div>
        </div>

        {/* Reasoning panel */}
        <div className="bg-violet-50 rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Why this was recommended
          </p>
          <p className="text-[13px] text-slate-700 leading-relaxed">{gap.reason}</p>
        </div>

        {/* Compatible items */}
        {gap.compatibleItems.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Works with items you own
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {gap.compatibleItems.map((item) => (
                <div key={String(item._id)} className="flex flex-col items-center gap-1.5 shrink-0">
                  <div
                    className="w-12 h-12 rounded-2xl border border-slate-100"
                    style={{ backgroundColor: item.dominantColourHex }}
                    data-testid="compatible-item-swatch"
                    data-colour={item.dominantColourHex}
                    data-name={item.name}
                  />
                  <span className="text-[10px] text-slate-400 max-w-[48px] text-center truncate">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search query */}
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Search query
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={activeQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 font-mono text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-400"
              data-testid="search-query-input"
            />
            <button
              onClick={handleCopy}
              className="border border-slate-200 bg-white text-slate-700 rounded-xl px-3 py-2.5 text-sm shrink-0"
              aria-label="Copy search query"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            Edit the search before opening if you want different results
          </p>
        </div>

        {/* CTA */}
        <div className="pt-2">
          <button
            onClick={handleOpenShopping}
            className="w-full bg-violet-700 text-white rounded-xl px-6 py-3.5 text-sm font-medium active:scale-[0.98] transition-transform"
            data-testid="open-google-shopping"
            data-search-url={`https://www.google.com/search?q=${encodeURIComponent(activeQuery)}&tbm=shop`}
          >
            Open Google Shopping
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-2">Opens in your browser</p>
        </div>
      </div>
    </div>
  );
}
