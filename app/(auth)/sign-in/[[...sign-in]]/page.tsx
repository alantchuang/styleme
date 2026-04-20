import { SignIn } from "@clerk/nextjs";

interface Props {
  searchParams: Promise<{ deleted?: string }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const wasDeleted = params.deleted === "true";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">StyleMe</h1>
          <p className="text-slate-500 mt-2 text-sm">Your AI wardrobe assistant</p>
        </div>

        {wasDeleted && (
          <div className="mb-6 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-center">
            <p className="text-sm text-slate-600">Your account has been deleted.</p>
          </div>
        )}

        <SignIn
          fallbackRedirectUrl="/outfits"
          appearance={{
            elements: {
              card: "shadow-none border border-slate-200 rounded-2xl",
              headerTitle: "text-slate-900",
              formButtonPrimary:
                "bg-violet-700 hover:bg-violet-800 text-white rounded-xl",
            },
          }}
        />
      </div>
    </div>
  );
}
