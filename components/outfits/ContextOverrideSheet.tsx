"use client";

import { useState } from "react";
import { sanitiseOccasion, isValidOccasion } from "@/lib/occasionUtils";

const OCCASIONS = ["Casual", "Work", "Date night", "Gym", "Travel", "Smart casual", "Other"];

interface ContextOverrideSheetProps {
  isOpen: boolean;
  currentOccasion: string;
  onClose: () => void;
  onUpdate: (occasion: string) => void;
}

export default function ContextOverrideSheet({
  isOpen,
  currentOccasion,
  onClose,
  onUpdate,
}: ContextOverrideSheetProps) {
  const [selected, setSelected] = useState(currentOccasion);
  const [customOccasion, setCustomOccasion] = useState("");

  if (!isOpen) return null;

  const isOtherSelected = selected === "Other";
  const sanitised = sanitiseOccasion(customOccasion);
  const canSubmit = isOtherSelected ? isValidOccasion(sanitised) : true;

  const handleChipTap = (occ: string) => {
    setSelected(occ);
    if (occ !== "Other") setCustomOccasion("");
  };

  const handleSubmit = () => {
    const finalOccasion = isOtherSelected ? sanitised : selected;
    onUpdate(finalOccasion);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="bg-surface-container-lowest rounded-t-3xl fixed bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto z-50 pb-8">
        <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mt-3" />

        <div className="px-6 pt-4">
          <h2 className="font-headline text-2xl text-on-surface">Change occasion</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">Weather is detected automatically</p>

          <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase mt-5">
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

          {/* Other free-text */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              isOtherSelected ? "max-h-24" : "max-h-0"
            }`}
          >
            <input
              type="text"
              value={customOccasion}
              onChange={(e) => setCustomOccasion(e.target.value)}
              maxLength={80}
              autoFocus={isOtherSelected}
              placeholder="Describe the occasion..."
              aria-label="Custom occasion"
              className="w-full mt-3 border border-outline-variant rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary bg-surface-container-lowest"
            />
            <p className="text-[11px] text-on-surface-variant mt-1">
              e.g. Wedding guest, Job interview, Beach day
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full mt-6 bg-primary text-on-primary rounded-full px-6 py-3 text-sm font-label tracking-wide font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            Update outfits
          </button>
        </div>
      </div>
    </>
  );
}
