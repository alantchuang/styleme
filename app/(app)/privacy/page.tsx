"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

export default function PrivacyPage() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const exportData = useQuery(api.users.exportData);
  const deleteAccountAction = useAction(api.users.deleteAccount);

  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const isOffline = !isAuthenticated;

  function handleDownload() {
    if (!exportData) return;
    setDownloadLoading(true);
    setDownloadError(false);
    try {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "styleme-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PrivacyPage: download failed", err);
      setDownloadError(true);
    } finally {
      setDownloadLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    setDeleteLoading(true);
    setDeleteError(false);
    try {
      await deleteAccountAction({});
      window.location.href = "/sign-in?deleted=true";
    } catch (err) {
      console.error("PrivacyPage: deleteAccount failed", err);
      setDeleteLoading(false);
      setDeleteError(true);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      {/* AppHeader */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-outline-variant/20 h-[72px] flex items-center px-4 gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container-low"
          aria-label="Back"
        >
          <svg className="w-5 h-5 text-on-surface" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-headline text-lg text-on-surface">Privacy &amp; data</span>
      </div>

      <div className="px-6 py-4 pb-28">
        {/* What we store */}
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          What we store
        </p>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mt-3">
          <ul className="text-[13px] text-slate-600 leading-relaxed space-y-2">
            {[
              "Wardrobe photos (stored privately in Convex Storage)",
              "Profile photo (analysed once, stored as a text description)",
              "Height, hair colour, body silhouette",
              "Style and fit preferences",
              "Daily location (used for weather only, cached 30 minutes)",
              "Outfit swipe history (used to personalise suggestions)",
              "Age and date of birth",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-slate-400 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Our commitment */}
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-6">
          Our commitment
        </p>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mt-3">
          <ul className="space-y-3">
            {[
              "Your data is never sold or shared with third parties",
              "Your data is never used to train AI models",
              "You can delete everything at any time",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-[13px] text-slate-700">
                <svg className="w-4 h-4 text-violet-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal links */}
        <div className="flex gap-4 mt-4">
          <Link href="/privacy-policy" className="text-[13px] text-violet-700 underline-offset-2 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-[13px] text-violet-700 underline-offset-2 hover:underline">
            Terms of Service
          </Link>
        </div>

        {/* Download your data */}
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-6">
          Your data
        </p>
        <button
          onClick={handleDownload}
          disabled={downloadLoading || !exportData || isOffline}
          className="mt-3 w-full border border-outline-variant bg-surface-container-lowest text-on-surface rounded-full px-6 py-3 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {downloadLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin text-on-surface-variant" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Preparing your data...
            </>
          ) : (
            "Download my data"
          )}
        </button>
        {downloadError && (
          <p className="text-[13px] text-rose-500 mt-2 text-center">
            Couldn&apos;t prepare your data — try again
          </p>
        )}

        {/* Danger zone */}
        <p className="text-xs font-medium text-rose-500 uppercase tracking-wide mt-6">
          Danger zone
        </p>
        <div className="bg-rose-50 rounded-2xl border border-rose-100 p-4 mt-3">
          <p className="text-[13px] text-rose-700">
            Permanently delete your account and all data. This cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteSheet(true)}
            disabled={isOffline}
            className="mt-3 w-full text-rose-500 text-sm font-medium border border-rose-200 rounded-xl px-6 py-3 disabled:opacity-50"
          >
            Delete my account
          </button>
        </div>
      </div>

      {/* Delete confirmation sheet */}
      {showDeleteSheet && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => { if (!deleteLoading) setShowDeleteSheet(false); }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[50vh] px-6 pt-4 pb-8 max-w-sm mx-auto">
            {/* Drag handle */}
            <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mb-5" />

            <h2 className="text-base font-medium text-slate-900">
              Delete your account?
            </h2>
            <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">
              This will permanently delete your wardrobe, outfits, style history, and account. This cannot be undone.
            </p>

            {deleteError && (
              <p className="text-[13px] text-rose-600 mt-3">
                Couldn&apos;t delete your account. Please try again or contact support.
              </p>
            )}

            <button
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              className="mt-4 w-full bg-rose-500 text-white rounded-xl px-6 py-3 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Deleting your data...
                </>
              ) : (
                "Yes, delete everything"
              )}
            </button>

            {!deleteLoading && (
              <button
                onClick={() => setShowDeleteSheet(false)}
                className="mt-3 w-full border border-outline-variant bg-surface-container-lowest text-on-surface rounded-full px-6 py-3 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
