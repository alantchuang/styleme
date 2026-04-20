"use client";

import { useState, useRef, useEffect } from "react";
import { sanitiseOccasion, isValidOccasion } from "@/lib/occasionUtils";

const OCCASIONS = ["Casual", "Work", "Date night", "Gym", "Travel", "Smart casual", "Other"];

interface ColdStartPickerProps {
  onGenerate: (occasion: string) => void;
  isGenerating: boolean;
  totalSwipes: number;
}

export default function ColdStartPicker({
  onGenerate,
  isGenerating,
  totalSwipes,
}: ColdStartPickerProps) {
  const [selected, setSelected] = useState("Casual");
  const [customOccasion, setCustomOccasion] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isOtherSelected = selected === "Other";
  const sanitised = sanitiseOccasion(customOccasion);
  const canGenerate = isOtherSelected ? isValidOccasion(sanitised) : true;

  useEffect(() => {
    if (isOtherSelected) {
      inputRef.current?.focus();
    }
  }, [isOtherSelected]);

  const handleChipTap = (occ: string) => {
    setSelected(occ);
    if (occ !== "Other") setCustomOccasion("");
  };

  const handleGenerate = () => {
    if (!canGenerate || isGenerating) return;
    const finalOccasion = isOtherSelected ? sanitised : selected;
    onGenerate(finalOccasion);
  };

  return (
    <div className="px-6 pt-4 pb-8">
      <h2 className="font-headline text-2xl text-on-surface">What's the occasion?</h2>
      <p className="text-sm text-on-surface-variant mt-0.5">We'll handle the weather automatically</p>

      <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase mt-6">
        Occasion
      </p>

      <div className="flex flex-wrap gap-2 mt-3">
        {OCCASIONS.map((occ) => (
          <button
            key={occ}
            onClick={() => handleChipTap(occ)}
            className={
              selected === occ
                ? "bg-primary text-on-primary border border-primary rounded-full px-4 py-2 text-sm"
                : "bg-surface-container-lowest text-on-surface border border-outline-variant rounded-full px-4 py-2 text-sm"
            }
          >
            {occ}
          </button>
        ))}
      </div>

      {/* Other free-text reveal */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOtherSelected ? "max-h-24" : "max-h-0"
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={customOccasion}
          onChange={(e) => setCustomOccasion(e.target.value)}
          maxLength={80}
          placeholder="Describe the occasion..."
          aria-label="Custom occasion"
          className="w-full mt-3 border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary bg-surface-container-lowest"
        />
        <p className="text-[11px] text-on-surface-variant mt-1">
          e.g. Wedding guest, Job interview, Beach day
        </p>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className="w-full mt-6 bg-primary text-on-primary rounded-full py-3.5 text-sm font-label tracking-wide font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
      >
        {isGenerating ? "Generating..." : "Generate outfits"}
      </button>

      {totalSwipes >= 10 && (
        <p className="text-[11px] text-on-surface-variant text-center mt-2">
          AI will auto-detect next time
        </p>
      )}
    </div>
  );
}
