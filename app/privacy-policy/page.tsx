import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/" className="text-sm text-violet-700 hover:underline mb-6 inline-block">
        ← Back to StyleMe
      </Link>

      <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: March 2026</p>

      <div className="prose prose-slate max-w-none text-[15px] leading-relaxed space-y-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">What we collect</h2>
          <p className="text-slate-600">
            StyleMe collects the following information to provide personalised outfit recommendations:
          </p>
          <ul className="list-disc pl-5 mt-2 text-slate-600 space-y-1">
            <li>Your email address and date of birth (used for account creation and age verification)</li>
            <li>Wardrobe photos (stored privately in Convex Storage, never shared)</li>
            <li>Profile photo (analysed once by AI to improve outfit styling; stored as a text description only)</li>
            <li>Physical attributes you provide: height, hair colour, body silhouette, fit preferences</li>
            <li>Style preferences and outfit swipe history (used to personalise recommendations)</li>
            <li>Location data (used only to fetch weather for outfit suggestions; cached for 30 minutes)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">How we use your data</h2>
          <p className="text-slate-600">
            Your data is used solely to generate personalised outfit suggestions and identify wardrobe gaps.
            We do not sell, share, or license your personal data to any third party. Your data is never
            used to train AI models — all AI calls are made to the Claude API (Anthropic) for real-time
            inference only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Data storage</h2>
          <p className="text-slate-600">
            All user data is stored in Convex Cloud (convex.dev). Photos are stored in Convex Storage with
            permanent URLs accessible only to the authenticated user. Authentication is managed by Clerk
            (clerk.com). We do not operate our own servers — your data is held by these trusted infrastructure
            providers under their respective security and privacy standards.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Your rights</h2>
          <p className="text-slate-600">
            You can download all your data at any time from the Privacy &amp; Data screen in your profile.
            You can permanently delete your account and all associated data at any time — deletion is
            immediate and irreversible. We do not retain backups of deleted user data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Minimum age</h2>
          <p className="text-slate-600">
            StyleMe requires users to be at least 13 years old. We do not knowingly collect data from
            children under 13. If you believe a child under 13 has created an account, please contact us
            and we will delete the account immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Changes to this policy</h2>
          <p className="text-slate-600">
            We may update this policy from time to time. Significant changes will be communicated in-app.
            Continued use of StyleMe after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Contact</h2>
          <p className="text-slate-600">
            For any privacy-related questions, please contact us via the StyleMe app.
          </p>
        </section>
      </div>
    </div>
  );
}
