// TODO M9 (production): replace hardcoded domain with process.env.CLERK_ISSUER_URL
// and run: npx convex env set CLERK_ISSUER_URL <prod-clerk-issuer-url>
export default {
  providers: [
    {
      domain: "https://relaxed-macaque-36.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
