"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import BodySilhouetteSelector from "@/components/onboarding/BodySilhouetteSelector";
import FitPreferenceSelector from "@/components/onboarding/FitPreferenceSelector";

type SilhouetteValue =
  | "hourglass" | "rectangle" | "pear"
  | "inverted_triangle" | "apple" | "petite";

type FitValue = "oversized" | "relaxed" | "fitted" | "tailored";
type GenderValue = "female" | "male";

const GENDER_OPTIONS: { value: GenderValue; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male",   label: "Male" },
];

function calcAge(dob: string): number | null {
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) age--;
  return age;
}

const STYLE_OPTIONS = [
  "Casual", "Minimalist", "Classic", "Streetwear", "Formal",
  "Bold", "Boho", "Sporty", "Romantic", "Smart casual",
];

export default function ProfileEditPage() {
  const router = useRouter();
  const profile = useQuery(api.users.getProfile);
  const updateProfile = useMutation(api.users.updateProfile);

  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<GenderValue | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [hairColour, setHairColour] = useState("");
  const [hairStyle, setHairStyle] = useState("");
  const [bodySilhouette, setBodySilhouette] = useState<SilhouetteValue | null>(null);
  const [fitPreferences, setFitPreferences] = useState<FitValue[]>([]);
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [error, setError] = useState("");

  // Pre-populate from reactive profile query
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setDateOfBirth(profile.dateOfBirth ?? "");
    setGender((profile.gender as GenderValue) ?? null);
    setHeightCm(profile.heightCm ? String(profile.heightCm) : "");
    setHairColour(profile.hairColour ?? "");
    setHairStyle(profile.hairStyle ?? "");
    setBodySilhouette((profile.bodySilhouette as SilhouetteValue) ?? null);
    setFitPreferences((profile.fitPreferences ?? []) as FitValue[]);
    setStylePreferences(profile.stylePreferences ?? []);
  }, [profile]);

  function toggleStyle(style: string) {
    setStylePreferences((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  }

  async function handleSave() {
    // Client-side age guard — avoids a round-trip for an obvious invalid DOB
    if (dateOfBirth && dateOfBirth !== profile?.dateOfBirth && calcAge(dateOfBirth) !== null && calcAge(dateOfBirth)! < 13) {
      setError("You must be 13 or older to use StyleMe.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        dateOfBirth: dateOfBirth && dateOfBirth !== profile?.dateOfBirth ? dateOfBirth : undefined,
        gender: gender ?? undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        hairColour: hairColour.trim() || undefined,
        hairStyle: hairStyle.trim() || undefined,
        bodySilhouette: bodySilhouette ?? undefined,
        fitPreferences: fitPreferences.length > 0 ? fitPreferences : undefined,
        stylePreferences: stylePreferences.length > 0 ? stylePreferences : undefined,
      });
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    } catch (err: unknown) {
      console.error("profile edit save failed", err);
      const code = (err as { data?: { code?: string } })?.data?.code;
      if (code === "too_young") {
        setError("You must be 13 or older to use StyleMe.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (profile === undefined) {
    return (
      <div className="px-4 pt-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto px-4 pb-6">
      {/* Toast */}
      {toast && (
        <div data-testid="toast-profile-updated" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg">
          Profile updated
        </div>
      )}

      <h1 className="text-lg font-medium text-slate-900 pt-4 pb-2">Edit profile</h1>

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="space-y-4 mt-2">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Date of birth
            {dateOfBirth && calcAge(dateOfBirth) !== null && (
              <span className="ml-2 text-slate-400 font-normal">
                ({calcAge(dateOfBirth)} years old)
              </span>
            )}
          </label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">Gender</label>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(gender === opt.value ? null : opt.value)}
                className={
                  gender === opt.value
                    ? "px-4 py-2 rounded-full text-sm border-2 border-violet-600 bg-violet-50 text-violet-800 font-medium"
                    : "px-4 py-2 rounded-full text-sm border border-slate-200 bg-white text-slate-600"
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Height (cm)</label>
          <input
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="e.g. 165"
            min={100}
            max={250}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Hair colour</label>
          <input
            type="text"
            value={hairColour}
            onChange={(e) => setHairColour(e.target.value)}
            placeholder="e.g. Brown"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Hair style</label>
          <input
            type="text"
            value={hairStyle}
            onChange={(e) => setHairStyle(e.target.value)}
            placeholder="e.g. Shoulder-length, curly"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4">
            Which shape is most like yours?
          </p>
          <BodySilhouetteSelector
            value={bodySilhouette}
            onChange={setBodySilhouette}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4">
            How do you like your clothes to fit?
          </p>
          <FitPreferenceSelector
            value={fitPreferences}
            onChange={setFitPreferences}
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-4 mb-2">
            My style is...
          </p>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map((style) => {
              const selected = stylePreferences.includes(style);
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => toggleStyle(style)}
                  className={
                    selected
                      ? "bg-violet-700 text-white border border-violet-700 rounded-full px-4 py-2 text-sm"
                      : "bg-white text-slate-600 border border-slate-200 rounded-full px-4 py-2 text-sm"
                  }
                >
                  {style}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8 mb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-slate-200 bg-white text-slate-700 rounded-xl px-6 py-3 text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
