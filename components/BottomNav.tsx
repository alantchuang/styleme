"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/wardrobe",
    label: "Closet",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <path d="M7 8h2m-2 4h2m7-4h2m-2 4h2" />
      </svg>
    ),
  },
  {
    href: "/outfits",
    label: "Outfits",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L8 6H4l2 14h12L20 6h-4L12 2z" />
        <path d="M8 6c0 2.2 1.8 4 4 4s4-1.8 4-4" />
      </svg>
    ),
  },
  {
    href: "/saved",
    label: "Saved",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    href: "/shopping",
    label: "Shopping",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4">
      <div className="bg-white/90 backdrop-blur-2xl w-full max-w-md rounded-full px-3 py-2 shadow-[0_20px_50px_rgba(100,87,131,0.1)] flex justify-around items-center">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-full transition-all duration-300 ${
                isActive
                  ? "bg-violet-50 text-violet-700"
                  : "text-stone-400 hover:text-violet-600"
              }`}
            >
              <span
                className={`transition-all duration-300 ${isActive ? "[&_path]:fill-violet-100 [&_path]:stroke-violet-700 [&_line]:stroke-violet-700 [&_rect]:stroke-violet-700 [&_circle]:stroke-violet-700" : ""}`}
              >
                {tab.icon}
              </span>
              <span className="text-[10px] font-medium tracking-wide uppercase leading-none">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
