"use client";

const ALL_SEASON_TAGS = ["summer", "winter", "all-season"] as const;

interface SeasonTagEditorProps {
  seasonTags: string[];
  onChange: (tags: string[]) => void;
}

export default function SeasonTagEditor({ seasonTags, onChange }: SeasonTagEditorProps) {
  function toggle(tag: string) {
    if (seasonTags.includes(tag)) {
      onChange(seasonTags.filter((t) => t !== tag));
    } else {
      onChange([...seasonTags, tag]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SEASON_TAGS.map((tag) => {
        const selected = seasonTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              selected
                ? "bg-violet-100 text-violet-700 border border-violet-300"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
