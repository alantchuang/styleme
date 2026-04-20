# Environment Bootstrap Guide
**Project:** StyleMe | **Version:** 2.1 | **Date:** March 2026

> **Expected time:** ~15 minutes from zero to running local stack. No Docker required.

**Prerequisites:** Mac or Linux. Node.js 20+. npm 10+. Git. Claude Code Desktop (see Step 0). Anthropic Pro or Max subscription (required for Claude Code).  
**Accounts needed:** Convex (free), Clerk (free), Anthropic (Pro/Max).

**Local development pattern with Claude Code Desktop:**
```
Claude Code Desktop  ← runs in your project directory, reads CLAUDE.md automatically
Terminal tab 1       ← npx convex dev  (leave running — syncs schema continuously)
Terminal tab 2       ← npm run dev     (leave running — Next.js at localhost:3000)
```
Claude Code Desktop can also run these commands itself — ask it to start them if you prefer not to manage separate tabs.

---

## Step 0 — Install Claude Code Desktop

Download and install Claude Code Desktop from https://claude.ai/download, or install via the terminal:

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Sign in with your Anthropic account. A **Pro or Max subscription** is required — the free tier does not include Claude Code.

Once installed, open Claude Code Desktop and use **File → Open Folder** (or `claude .` from the terminal) to open your project directory. Claude Code will read `CLAUDE.md` automatically on every session start.

---

## Step 1 — Pin Node.js version

```bash
echo '20' > .nvmrc
nvm use        # if using nvm
node --version # should print v20.x.x
```

---

## Step 2 — Create the Next.js project

```bash
npx create-next-app@latest styleme \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias '@/*'

cd styleme

# Add Node engine constraint
node -e "
  const p = require('./package.json');
  p.engines = { node: '>=20.0.0' };
  require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2));
"
```

Install all dependencies:

```bash
npm install \
  convex \
  @clerk/nextjs \
  @anthropic-ai/sdk \
  @react-spring/web \
  @use-gesture/react \
  sharp \
  date-fns

npm install -D \
  @types/node \
  eslint \
  eslint-config-next \
  vitest \
  @vitest/coverage-v8
```

> **Note:** `convex/react-clerk` is **not a separate npm package** — it's a subpath export built into the `convex` package. You import it as `import { ConvexProviderWithClerk } from "convex/react-clerk"` without installing anything extra.

Add scripts to `package.json`:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: { environment: 'node', globals: true },
  resolve: { alias: { '@': resolve(__dirname, '.') } },
});
```

---

## Step 3 — Set up Convex

Run this in a dedicated terminal tab and **leave it running** for the entire development session:

```bash
npx convex dev
```

This will:
1. Ask you to log in to Convex (opens browser) — create a free account at https://convex.dev if needed
2. Create a new Convex project (or link to an existing one)
3. Write `NEXT_PUBLIC_CONVEX_URL` to `.env.local` automatically
4. Start watching `/convex/` for changes and syncing to the cloud

> Convex runs in the cloud even for local development — no local server or Docker needed. Every time you save a file in `/convex/`, the watcher syncs it instantly.

**Terminal layout for development:**
```
Tab 1: npx convex dev     ← keep running (schema + function sync)
Tab 2: npm run dev        ← keep running (Next.js dev server, start at Step 9)
Claude Code Desktop       ← open in project directory (reads CLAUDE.md automatically)
```

Alternatively, you can ask Claude Code Desktop to start both processes itself — it can run `npx convex dev` and `npm run dev` as background processes and monitor their output without you managing separate tabs.

---

## Step 4 — Set up Clerk

1. Go to https://clerk.com and create a free account
2. Create a new application — name it "StyleMe"
3. Enable **Email** and **Google** as sign-in methods
4. Go to **API Keys** in the Clerk dashboard
5. Copy the **Publishable key** and **Secret key**

Configure Clerk with Convex:

```bash
# Where to find CLERK_ISSUER_URL:
# Clerk dashboard → API Keys → Advanced → JWT Issuer
# It looks like: https://your-app.clerk.accounts.dev
# (Do not confuse with the Frontend API URL — you need the JWT Issuer specifically)
```

```bash
# Set Clerk environment variable in Convex:
npx convex env set CLERK_ISSUER_URL https://your-app.clerk.accounts.dev
```

---

## Step 5 — Collect remaining API keys

**Anthropic:**
1. https://console.anthropic.com → Settings → API Keys → Create Key
2. Starts with `sk-ant-`
3. Verify access to `claude-sonnet-4-6`

> **Weather:** Open-Meteo requires no API key — no account or signup needed. Remove this step from your setup checklist.

---

## Step 6 — Create .env.local

`npx convex dev` (Step 3) already added `NEXT_PUBLIC_CONVEX_URL`. Add the remaining variables:

```bash
# Confirm .env.local is gitignored
grep -q '.env.local' .gitignore || echo '.env.local' >> .gitignore

# Append to .env.local (NEXT_PUBLIC_CONVEX_URL is already there from Step 3)
cat >> .env.local << 'EOF'

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_paste_here
CLERK_SECRET_KEY=sk_test_paste_here

# Anthropic (used in Convex actions — set as Convex env var too, see Step 7)
ANTHROPIC_API_KEY=sk-ant-paste_here

# App thresholds — keep in sync with /lib/constants.ts
COLD_START_SWIPE_THRESHOLD=20
SHOPPING_EMPTY_STATE_THRESHOLD=10
SHOPPING_GAP_STALE_HOURS=24
EOF
```

---

## Step 7 — Set Convex environment variables

Convex actions run on Convex's servers, not Next.js. They read environment variables from Convex — not from `.env.local`.

```bash
npx convex env set ANTHROPIC_API_KEY sk-ant-your-key-here
npx convex env set COLD_START_SWIPE_THRESHOLD 20
npx convex env set SHOPPING_EMPTY_STATE_THRESHOLD 10
npx convex env set SHOPPING_GAP_STALE_HOURS 24

# Verify they're set:
npx convex env list
```

> **Note:** No weather API key needed — Open-Meteo is called directly from `convex/weather.ts` with no authentication.

---

## Step 8 — Define the Convex schema

Create the schema file — Convex will sync it automatically when `npx convex dev` is running:

```bash
# convex/schema.ts already needs to exist for the app to work
# Claude Code will create this during Milestone 2
# For now, create a minimal placeholder:

cat > convex/schema.ts << 'EOF'
import { defineSchema } from "convex/server";
export default defineSchema({});
EOF
```

Verify Convex picks it up:
```bash
# In the terminal running 'npx convex dev', you should see:
# ✓ Schema updated
```

---

## Step 9 — Start the development server

In a second terminal tab (keep `npx convex dev` running in the first):

```bash
npm run dev
# App starts at http://localhost:3000
```

Verify everything is connected:

```bash
# Convex dashboard — view your data in real-time:
open https://dashboard.convex.dev

# Anthropic key:
curl https://api.anthropic.com/v1/messages \
  -H 'x-api-key: YOUR_ANTHROPIC_KEY' \
  -H 'anthropic-version: 2023-06-01' \
  -H 'content-type: application/json' \
  -d '{"model":"claude-sonnet-4-6","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
# Should return JSON with content

# Verify Open-Meteo works (no key needed):
curl 'https://api.open-meteo.com/v1/forecast?latitude=51.5&longitude=-0.1&current=temperature_2m,weather_code'
# Should return JSON with current.temperature_2m and current.weather_code

# TypeScript compiles:
npm run build   # no errors expected

# Vitest configured:
npm test        # should print "No test files found" — correct at this stage
```

> **Optional — connect to Vercel now:** If you want preview URLs for testing on other devices (phone, tablet) throughout development — not just at M9 — you can connect your GitHub repo to Vercel at this point. Run `vercel` and follow the prompts to link the project. You'll get a preview URL on every PR, which is useful for mobile gesture testing from Milestone 4 onwards. Full production deployment steps are in M9 of BuildOrder.md.

---

## Step 10 — Deploy to production

Convex Cloud is already your backend — it was set up in Step 3. For production, create a separate Convex deployment:

```bash
# Create a production deployment
npx convex deploy --prod

# This deploys your schema and functions to a production Convex URL
# Set NEXT_PUBLIC_CONVEX_URL in Vercel to the production URL
```

```bash
# Deploy frontend to Vercel
npm install -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

Set all env vars in Vercel dashboard (Settings → Environment Variables):
- `NEXT_PUBLIC_CONVEX_URL` — your production Convex URL (from `npx convex deploy --prod` output)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ANTHROPIC_API_KEY` — also set in Convex prod env (see below)

> **No weather key needed** — Open-Meteo requires no API key in any environment.

```bash
# Set Convex production environment variables
npx convex env set ANTHROPIC_API_KEY sk-ant-prod-key --prod
npx convex env set CLERK_ISSUER_URL https://your-clerk-api.clerk.accounts.dev --prod
```

---

## Quick reference

### Claude Code Desktop

| Task | How |
|------|-----|
| Open project in Claude Code Desktop | `claude .` from terminal, or File → Open Folder |
| Start new milestone | Tell Claude: "Read CLAUDE.md. Implement Milestone N per docs/BuildOrder.md." |
| Verify ACs | Tell Claude: "Go through every AC for Milestone N. Verify what you can automatically, list what I need to do manually." |
| Open PR when ACs pass | Tell Claude: "Create a PR for milestone/N-name with title 'Milestone N — name'" |

### Terminal commands

| Task | Command |
|------|---------|
| Start Convex dev watcher | `npx convex dev` |
| Start Next.js dev server | `npm run dev` |
| Deploy Convex to production | `npx convex deploy --prod` |
| Deploy Next.js to Vercel | `vercel --prod` |
| View/edit data | `open https://dashboard.convex.dev` |
| Set Convex env var | `npx convex env set KEY value` |
| List Convex env vars | `npx convex env list` |
| Run tests | `npm test` |
| Run tests with coverage | `npm run test:coverage` |
| TypeScript check | `npm run build` |

### Git workflow

| Task | Command |
|------|---------|
| Start milestone branch | `git checkout main && git pull && git checkout -b milestone/N-name` |
| Commit during implementation | `git add . && git commit -m "feat: description"` |
| Open PR when ACs pass | `gh pr create --title "Milestone N — name"` |
| Delete branch after merge | `git branch -d milestone/N-name` |

---

## Troubleshooting

**`npx convex dev` fails — not logged in**
```bash
npx convex login   # opens browser for auth
npx convex dev
```

**Convex schema sync fails — TypeScript error in schema.ts**
```
# Check the terminal running 'npx convex dev' for the exact error
# Fix the schema.ts error — Convex will auto-retry
```

**Clerk sign-in redirect loop**
```
# Check NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set in .env.local
# Verify the Clerk application's allowed redirect URLs include http://localhost:3000
```

**Claude API returns 401 from Convex action**
```bash
npx convex env list   # verify ANTHROPIC_API_KEY is set in Convex env
# Note: .env.local variables are NOT available in Convex actions
# Must be set via: npx convex env set ANTHROPIC_API_KEY sk-ant-...
```

**Open-Meteo returns unexpected data**  
No API key is needed, but the API requires valid latitude and longitude. If `user.locationLat` or `user.locationLng` is null, skip the fetch and return `{ condition: null, tempC: null }` — the app handles null weather gracefully.

**sharp not working in Convex action**  
sharp is a native Node.js module. Convex actions run in a Node.js-like environment but require native modules to be declared as external. Create `convex.config.ts` in the project root:

```typescript
// convex.config.ts
import { defineApp } from "convex/server";

const app = defineApp();
export default app;
```

Then in each action file that uses sharp, add the `"use node"` directive at the top:

```typescript
// convex/wardrobe.ts
"use node";  // ← tells Convex to run this file in the Node.js runtime
import sharp from "sharp";
// rest of the file...
```

The `"use node"` directive must be the very first line of any Convex function file that uses sharp or other native Node.js modules. Without it, Convex runs in its default edge-like runtime where native modules are unavailable.

**TypeScript errors on Convex types**
```bash
# Convex auto-generates types when 'npx convex dev' is running
# If types are stale: stop and restart 'npx convex dev'
```
