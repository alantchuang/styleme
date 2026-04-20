"use client";

import { useState } from "react";
import ProfileSheet from "./ProfileSheet";

export default function AppHeader() {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 w-full z-50 h-[72px] bg-white/80 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(28,27,31,0.04)] flex justify-between items-center px-6">
        {/* Spacer to keep logo centred */}
        <div className="w-6" />

        {/* Logo */}
        <span className="font-headline italic text-2xl tracking-tighter text-stone-900 select-none">
          StyleMe
        </span>

        {/* Account icon — opens profile */}
        <button
          className="text-violet-700 hover:opacity-70 transition-opacity active:scale-95"
          aria-label="Profile"
          onClick={() => setProfileOpen(true)}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </button>
      </header>

      {profileOpen && <ProfileSheet onClose={() => setProfileOpen(false)} />}
    </>
  );
}
