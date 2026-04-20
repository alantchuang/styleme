"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/** Ensures a Convex user document exists for the signed-in Clerk user.
 *  Redirects to /onboarding if the user has not completed onboarding. */
export default function UserBootstrap() {
  const ensureUser = useMutation(api.users.ensureUser);
  const profile = useQuery(api.users.getProfile);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    ensureUser().catch((err) =>
      console.error("UserBootstrap.ensureUser", err)
    );
  }, [ensureUser]);

  useEffect(() => {
    if (profile === undefined) return; // still loading
    if (profile === null) return; // unauthenticated
    const isOnboarded =
      profile.onboardingComplete === true ||
      (profile.stylePreferences?.length ?? 0) > 0 ||
      !!profile.bodySilhouette;
    if (!isOnboarded && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [profile, pathname, router]);

  return null;
}
