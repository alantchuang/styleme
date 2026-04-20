"use client";

import { useEffect, useRef, useState } from "react";
import { useConvexConnectionState } from "convex/react";
import { useToast } from "./ToastProvider";

export default function OfflineBanner() {
  const { isWebSocketConnected } = useConvexConnectionState();
  const { showToast } = useToast();

  // Suppress SSR rendering — only show/hide banner on the client to avoid
  // hydration mismatches (server never has a WebSocket connection).
  const [mounted, setMounted] = useState(false);
  // Only show "Syncing..." toast after we have actually been offline —
  // not on the initial connection at page load.
  const hasBeenOffline = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isWebSocketConnected) {
      hasBeenOffline.current = true;
    } else if (hasBeenOffline.current) {
      showToast("Syncing...");
      hasBeenOffline.current = false;
    }
  }, [isWebSocketConnected, mounted, showToast]);

  if (!mounted || isWebSocketConnected) return null;

  return (
    <div
      role="status"
      data-testid="offline-banner"
      className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 text-sm font-medium text-center"
    >
      You&apos;re offline
    </div>
  );
}
