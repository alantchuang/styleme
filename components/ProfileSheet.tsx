"use client";

import { useQuery } from "convex/react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";

interface ProfileSheetProps {
  onClose: () => void;
}

export default function ProfileSheet({ onClose }: ProfileSheetProps) {
  const profile = useQuery(api.users.getProfile);
  const wardrobeData = useQuery(api.wardrobe.list);
  const likedCount = useQuery(api.swipes.getLikedCount);
  const { signOut } = useClerk();
  const router = useRouter();

  const totalSwipes = profile?.totalSwipes ?? 0;
  const liked = likedCount ?? 0;
  const itemCount = wardrobeData?.items.length ?? 0;
  const styleScore =
    totalSwipes > 0 ? Math.round((liked / totalSwipes) * 100) : 0;

  const initials = profile?.displayName
    ? profile.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  const dna = profile?.preferenceSummary;

  async function handleSignOut() {
    onClose();
    await signOut();
    window.location.href = "/sign-in";
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="bg-surface-container-lowest rounded-t-3xl fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto">
        {/* Drag handle */}
        <div className="w-10 h-1 bg-outline-variant rounded-full mx-auto mt-3 mb-5" />

        {/* User header */}
        <div className="px-6 flex items-center gap-4 mb-5">
          {profile?.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profilePhotoUrl}
              alt={profile.displayName}
              className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-lg font-medium">{initials}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-headline text-xl text-on-surface truncate">
              {profile?.displayName ?? ""}
            </p>
            <p className="text-[13px] text-on-surface-variant mt-0.5">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Stat cards — 2×2 grid */}
        <div className="px-6 grid grid-cols-2 gap-3 mb-6">
          <div className="bg-surface-container-low rounded-xl p-3">
            <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase">Swipes</p>
            <p className="font-headline text-2xl text-on-surface mt-1">{totalSwipes}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3">
            <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase">Liked</p>
            <p className="font-headline text-2xl text-on-surface mt-1">{liked}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3">
            <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase">Items</p>
            <p className="font-headline text-2xl text-on-surface mt-1">{itemCount}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3">
            <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase">Style score</p>
            <p className="font-headline text-2xl text-on-surface mt-1">{styleScore}%</p>
          </div>
        </div>

        {/* Style DNA */}
        <div className="px-6 mb-6">
          <p className="font-label text-[10px] tracking-widest text-on-surface-variant uppercase mb-3">
            Style DNA
          </p>
          {dna ? (
            <>
              <p className="text-[13px] text-on-surface-variant italic leading-relaxed mb-3">
                {dna.summarySentence}
              </p>
              {dna.likedStyles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {dna.likedStyles.map((style) => (
                    <span
                      key={style}
                      className="bg-primary-container text-on-primary-container text-xs font-medium rounded-full px-3 py-1"
                    >
                      {style}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-[13px] text-on-surface-variant">
              Swipe more outfits to reveal your style DNA
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-surface-container mx-6 mb-2" />

        {/* Menu rows */}
        <div className="px-6 pb-28">
          <button
            onClick={() => { onClose(); router.push("/profile/edit"); }}
            className="w-full flex items-center justify-between py-4 text-sm text-on-surface"
          >
            <span>Edit profile</span>
            <span className="text-on-surface-variant">›</span>
          </button>
          <div className="h-px bg-surface-container" />
          <button
            onClick={() => { onClose(); router.push("/privacy"); }}
            className="w-full flex items-center justify-between py-4 text-sm text-on-surface"
          >
            <span>Privacy and data</span>
            <span className="text-on-surface-variant">›</span>
          </button>
          <div className="h-px bg-surface-container" />
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between py-4 text-sm font-medium text-error"
          >
            <span>Sign out</span>
            <span>›</span>
          </button>
        </div>
      </div>
    </>
  );
}
