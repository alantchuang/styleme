"use client";

// Simple SVG torso silhouettes for each body type.
// Drawn in a 64×96 viewBox; shoulder → waist → hip with cubic bezier curves.
const SILHOUETTE_PATHS: Record<string, string> = {
  // Wide shoulders, narrow waist, wide hips
  hourglass:
    "M 10,12 L 54,12 C 54,32 44,32 44,50 C 44,68 54,68 54,85 L 10,85 C 10,68 20,68 20,50 C 20,32 10,32 10,12 Z",
  // Uniform width throughout
  rectangle:
    "M 16,12 L 48,12 L 48,85 L 16,85 Z",
  // Narrow shoulders, wide hips
  pear:
    "M 20,12 L 44,12 C 44,32 47,32 47,50 C 47,68 58,68 58,85 L 6,85 C 6,68 17,68 17,50 C 17,32 20,32 20,12 Z",
  // Wide shoulders, narrow hips
  inverted_triangle:
    "M 6,12 L 58,12 C 58,32 50,32 50,50 C 50,68 42,68 42,85 L 22,85 C 22,68 14,68 14,50 C 14,32 6,32 6,12 Z",
  // Wider around the middle
  apple:
    "M 16,12 L 48,12 C 48,32 56,32 56,50 C 56,68 50,68 50,85 L 14,85 C 14,68 8,68 8,50 C 8,32 16,32 16,12 Z",
  // Compact frame — proportionally smaller rectangle
  petite:
    "M 20,18 L 44,18 L 44,80 L 20,80 Z",
};

const SILHOUETTES = [
  { value: "hourglass",         label: "Hourglass" },
  { value: "rectangle",         label: "Rectangle" },
  { value: "pear",              label: "Pear" },
  { value: "inverted_triangle", label: "Inverted triangle" },
  { value: "apple",             label: "Apple" },
  { value: "petite",            label: "Petite" },
] as const;

type SilhouetteValue = (typeof SILHOUETTES)[number]["value"];

interface Props {
  value: SilhouetteValue | null;
  onChange: (value: SilhouetteValue) => void;
}

export default function BodySilhouetteSelector({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-3 mt-3">
      {SILHOUETTES.map((s) => {
        const selected = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={
              selected
                ? "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-violet-600 bg-violet-50 cursor-pointer"
                : "flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200 bg-white cursor-pointer"
            }
          >
            <svg
              viewBox="0 0 64 96"
              width={48}
              height={72}
              aria-hidden="true"
            >
              <path
                d={SILHOUETTE_PATHS[s.value]}
                fill={selected ? "#ede9fe" : "#f1f5f9"}
                stroke={selected ? "#7c3aed" : "#94a3b8"}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-xs font-medium text-slate-900 text-center leading-tight">
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
