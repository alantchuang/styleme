"use client";

const FIT_OPTIONS = [
  { value: "oversized", label: "Oversized" },
  { value: "relaxed", label: "Relaxed" },
  { value: "fitted", label: "Fitted" },
  { value: "tailored", label: "Tailored" },
] as const;

type FitValue = (typeof FIT_OPTIONS)[number]["value"];

interface Props {
  value: FitValue[];
  onChange: (value: FitValue[]) => void;
}

export default function FitPreferenceSelector({ value, onChange }: Props) {
  function toggle(pref: FitValue) {
    if (value.includes(pref)) {
      onChange(value.filter((v) => v !== pref));
    } else if (value.length < 2) {
      onChange([...value, pref]);
    } else {
      // Deselect the oldest (first) and add the new one
      onChange([value[1], pref]);
    }
  }

  return (
    <div className="grid grid-cols-4 gap-2 mt-3">
      {FIT_OPTIONS.map((f) => {
        const selected = value.includes(f.value);
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => toggle(f.value)}
            className={
              selected
                ? "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-violet-600 bg-violet-50 cursor-pointer"
                : "flex flex-col items-center gap-2 p-3 rounded-2xl border border-slate-200 bg-white cursor-pointer"
            }
          >
            {/* Placeholder illustration — TBD */}
            <div className="w-12 h-16 rounded-xl bg-slate-100" />
            <span className="text-xs font-medium text-slate-900 text-center">
              {f.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
