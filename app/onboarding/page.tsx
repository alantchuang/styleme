"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import BodySilhouetteSelector from "@/components/onboarding/BodySilhouetteSelector";
import FitPreferenceSelector from "@/components/onboarding/FitPreferenceSelector";

const TOTAL_STEPS = 4;

const STYLE_OPTIONS = [
  "Casual", "Minimalist", "Classic", "Streetwear", "Formal",
  "Bold", "Boho", "Sporty", "Romantic", "Smart casual",
];

type SilhouetteValue =
  | "hourglass" | "rectangle" | "pear"
  | "inverted_triangle" | "apple" | "petite";

type FitValue = "oversized" | "relaxed" | "fitted" | "tailored";

export default function OnboardingPage() {
  const router = useRouter();
  const updateProfile = useMutation(api.users.updateProfile);
  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const uploadPhoto = useAction(api.usersNode.uploadPhoto);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 consent
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);

  // Step 2a fields
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [hairColour, setHairColour] = useState("");
  const [hairStyle, setHairStyle] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Step 2b fields
  const [bodySilhouette, setBodySilhouette] = useState<SilhouetteValue | null>(null);
  const [fitPreferences, setFitPreferences] = useState<FitValue[]>([]);

  // Step 3 fields
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function toggleStyle(style: string) {
    setStylePreferences((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    );
  }

  async function handleStep2aNext() {
    setSaving(true);
    setError("");
    try {
      // Upload photo if provided
      if (photoFile) {
        setPhotoUploading(true);
        const buffer = await photoFile.arrayBuffer();
        await uploadPhoto({ fileBuffer: buffer });
        setPhotoUploading(false);
      }

      const patch: Record<string, unknown> = {};
      if (displayName.trim()) patch.displayName = displayName.trim();
      if (heightCm) patch.heightCm = Number(heightCm);
      if (hairColour.trim()) patch.hairColour = hairColour.trim();
      if (hairStyle.trim()) patch.hairStyle = hairStyle.trim();
      if (Object.keys(patch).length > 0) {
        await updateProfile(patch);
      }

      setStep(2);
    } catch (err) {
      console.error("onboarding step 2a failed", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
      setPhotoUploading(false);
    }
  }

  async function handleStep2bNext() {
    setSaving(true);
    setError("");
    try {
      await updateProfile({
        bodySilhouette: bodySilhouette ?? undefined,
        fitPreferences: fitPreferences.length > 0 ? fitPreferences : undefined,
      });
      setStep(3);
    } catch (err) {
      console.error("onboarding step 2b failed", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStep3Next() {
    if (stylePreferences.length === 0) return;
    setSaving(true);
    setError("");
    try {
      await updateProfile({ stylePreferences });
      setStep(4);
    } catch (err) {
      console.error("onboarding step 3 failed", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleFinish() {
    setSaving(true);
    setError("");
    try {
      await completeOnboarding();
      router.push("/outfits");
    } catch (err) {
      console.error("onboarding complete failed", err);
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  async function handleSkipAndFinish() {
    setSaving(true);
    try {
      await completeOnboarding();
      router.push("/outfits");
    } catch {
      router.push("/outfits");
    }
  }

  const progressWidth = `${(step / TOTAL_STEPS) * 100}%`;

  return (
    <div className="max-w-sm mx-auto px-6 pb-24">
      {/* Progress bar */}
      <div className="h-[3px] bg-slate-100 rounded-full mt-4 mx-[-24px]">
        <div
          className="h-[3px] bg-violet-600 rounded-full transition-all duration-300"
          style={{ width: progressWidth }}
        />
      </div>

      {/* Step counter */}
      <div className="flex justify-end mt-2">
        <span className="text-[11px] text-slate-400">Step {step} of {TOTAL_STEPS}</span>
      </div>

      {error && (
        <div className="mt-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
          {error}
        </div>
      )}

      {/* ── Step 1: Photo + basic details ─────────────────────── */}
      {step === 1 && (
        <div className="mt-6">
          <h1 className="text-lg font-medium text-slate-900">Your profile</h1>
          <p className="text-[13px] text-slate-600 leading-relaxed mt-1">
            Tell us a bit about yourself so we can personalise your outfits.
          </p>

          {/* Photo upload */}
          <div className="flex flex-col items-center mt-6">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden"
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Helps the AI style outfits for you
            </p>
            <p className="text-[11px] text-slate-400 text-center mt-1 leading-snug max-w-[200px]">
              Your photo is analysed once to help style outfits for you. It is never shared or used to train AI.
            </p>
          </div>

          {/* Name */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Height (cm)
                </label>
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
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hair colour
              </label>
              <input
                type="text"
                value={hairColour}
                onChange={(e) => setHairColour(e.target.value)}
                placeholder="e.g. Brown"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Hair style
              </label>
              <input
                type="text"
                value={hairStyle}
                onChange={(e) => setHairStyle(e.target.value)}
                placeholder="e.g. Shoulder-length, curly"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-400"
              />
            </div>
          </div>

          {/* Consent checkboxes */}
          <div className="mt-6 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentTerms}
                onChange={(e) => setConsentTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-violet-700 flex-shrink-0"
              />
              <span className="text-[13px] text-slate-600 leading-snug">
                I agree to the{" "}
                <a href="/terms" target="_blank" className="text-violet-700 underline underline-offset-2">
                  Terms of Service
                </a>
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentPrivacy}
                onChange={(e) => setConsentPrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-violet-700 flex-shrink-0"
              />
              <span className="text-[13px] text-slate-600 leading-snug">
                I agree to the{" "}
                <a href="/privacy-policy" target="_blank" className="text-violet-700 underline underline-offset-2">
                  Privacy Policy
                </a>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* ── Step 2: Body silhouette + fit preference ──────────── */}
      {step === 2 && (
        <div className="mt-6">
          <h1 className="text-lg font-medium text-slate-900">Your shape &amp; fit</h1>

          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-6">
            Which shape is most like yours?
          </p>
          <BodySilhouetteSelector
            value={bodySilhouette}
            onChange={setBodySilhouette}
          />

          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-6">
            How do you like your clothes to fit?
          </p>
          <FitPreferenceSelector
            value={fitPreferences}
            onChange={setFitPreferences}
          />
        </div>
      )}

      {/* ── Step 3: Style preferences ─────────────────────────── */}
      {step === 3 && (
        <div className="mt-6">
          <h1 className="text-lg font-medium text-slate-900">My style is...</h1>
          <p className="text-[13px] text-slate-600 leading-relaxed mt-1">
            Select all that apply.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
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
      )}

      {/* ── Step 4: First wardrobe item ───────────────────────── */}
      {step === 4 && (
        <div className="mt-6">
          <h1 className="text-lg font-medium text-slate-900">Add your first item</h1>
          <p className="text-[13px] text-slate-600 leading-relaxed mt-1">
            Take a photo of any clothing item to get started
          </p>
          <div className="w-full h-48 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 mt-4 flex flex-col items-center justify-center gap-2">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-slate-400">Tap to add a photo</p>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-snug">
            Photos are stored privately and only used to generate outfit suggestions for you.
          </p>
        </div>
      )}

      {/* ── Sticky CTA bar ────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 max-w-sm mx-auto">
        <div className="flex gap-3 items-center">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="border border-slate-200 bg-white text-slate-700 rounded-xl px-6 py-3 text-sm"
            >
              Back
            </button>
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={handleStep2aNext}
              disabled={saving || !consentTerms || !consentPrivacy}
              className="flex-1 bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {photoUploading ? "Uploading photo..." : saving ? "Saving..." : "Continue"}
            </button>
          )}

          {step === 2 && (
            <button
              type="button"
              onClick={handleStep2bNext}
              disabled={saving || !bodySilhouette}
              className="flex-1 bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={handleStep3Next}
              disabled={saving || stylePreferences.length === 0}
              className="flex-1 bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
            >
              {saving ? "Saving..." : "Continue"}
            </button>
          )}

          {step === 4 && (
            <div className="flex-1 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="w-full bg-violet-700 text-white rounded-xl px-6 py-3 text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-60"
              >
                {saving ? "Saving..." : "Get started"}
              </button>
              <button
                type="button"
                onClick={handleSkipAndFinish}
                disabled={saving}
                className="w-full text-slate-500 text-sm py-1"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
