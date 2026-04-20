"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithAuth } from "convex/react";
import { ConvexReactClient } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/** Fetches the Convex JWT server-side to avoid clerk_offline errors from
 *  navigator.onLine === false blocking browser-side getToken calls. */
function useServerConvexAuth() {
  const { isLoaded, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const fetchFromServer = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/convex-token");
      const { token: t } = await res.json();
      tokenRef.current = t;
      setToken(t);
      return t;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      tokenRef.current = null;
      setToken(null);
      return;
    }

    let cancelled = false;
    fetchFromServer().then((t) => {
      if (cancelled) return;
      tokenRef.current = t;
      setToken(t);
    });

    // Refresh every 50 min (tokens expire after 60 min)
    const interval = setInterval(() => {
      if (!cancelled) fetchFromServer();
    }, 50 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isLoaded, isSignedIn, fetchFromServer]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (forceRefreshToken) return fetchFromServer();
      return tokenRef.current;
    },
    [fetchFromServer]
  );

  return useMemo(
    () => ({
      // Stay in loading state until we have a token for signed-in users,
      // preventing unauthenticated queries from racing ahead.
      isLoading: !isLoaded || (isSignedIn === true && token === null),
      isAuthenticated: isSignedIn === true && token !== null,
      fetchAccessToken,
    }),
    [isLoaded, isSignedIn, token, fetchAccessToken]
  );
}

export default function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useServerConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
