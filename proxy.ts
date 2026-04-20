import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/wardrobe(.*)",
  "/outfits(.*)",
  "/saved(.*)",
  "/shopping(.*)",
]);

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", req.url).toString(),
    });
  }
});

export default async function proxy(req: NextRequest, event: NextFetchEvent) {
  // Without the devBrowser cookie, clerkMiddleware's authenticateRequest triggers
  // a FAPI handshake. The FAPI, finding no session, bounces the user to
  // accounts.dev/sign-in (the Clerk AccountsPortal) instead of our local /sign-in.
  // Fix: skip clerkMiddleware when no devBrowser cookie is present.
  // Protected routes redirect straight to /sign-in; everything else passes through
  // so the <SignIn> Clerk JS component can set up the devBrowser cookie client-side.
  if (!req.cookies.has("__clerk_db_jwt")) {
    if (isProtectedRoute(req)) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
    return NextResponse.next();
  }

  return clerkHandler(req, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
