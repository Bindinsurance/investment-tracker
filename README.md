# Investment Tracker

A personal investment portfolio tracker for stocks, ETFs, and cryptocurrencies. Supports multiple brokers and account types, FIFO tax-lot tracking, CSV import, and PDF/CSV reports.

---

## Features

- **Portfolio Dashboard** — real-time value, unrealized/realized P&L, allocation charts
- **Multi-Broker, Multi-Account** — Roth IRA, Brokerage, 401k, and more
- **Buy, Sell & Dividend Transactions** — FIFO tax-lot engine, short-term vs long-term classification, dividend income tracking
- **CSV Import** — bulk import from any broker with column mapping; duplicate detection skips already-imported rows automatically
- **Tax Reports** — realized gains with cost basis, holding period, and estimated tax
- **Price Updates** — Yahoo Finance (free, no API key required); manual "Refresh Prices" button on Assets page; automatic daily cron job
- **Dark / Light theme**
- **Fully responsive** — desktop sidebar + mobile bottom nav

---

## Tech Stack

- **Next.js 14** (App Router, server components)
- **TypeScript**
- **Tailwind CSS + shadcn/ui**
- **Supabase** (PostgreSQL, Auth, Row Level Security)
- **Recharts** — dashboard charts
- **jsPDF + jspdf-autotable** — PDF export
- **PapaParse** — CSV parsing
- **Zod + React Hook Form** — validation

---

## Prerequisites

- Node.js 18+
- npm or pnpm
- A [Supabase](https://supabase.com) project (free tier works)
- No API keys required — stock/ETF prices are fetched from **Yahoo Finance** (free, no key)
- Optional: `CRON_SECRET` env var to secure the automatic price-update cron job

---

## Local Development Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd investment-tracker
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Supabase — find these in your project dashboard under Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Server-only — NEVER expose this in client code
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional: secures the /api/prices/update GET endpoint used by Vercel Cron
# Set the same value in Vercel dashboard under Settings > Environment Variables
CRON_SECRET=your_random_secret_here
```

> **No price API keys needed.** Prices are fetched from Yahoo Finance's public API (`query1.finance.yahoo.com/v8/finance/chart/{ticker}`) — no registration or key required.

### 3. Set up Supabase

#### a. Create the schema

In your Supabase project, go to **SQL Editor** and run each migration file in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

> You can paste the contents of each file directly into the SQL Editor and click **Run**.

#### b. (Optional) Seed default data

Run `supabase/seed.sql` in the SQL Editor to pre-populate:
- Common brokers (Fidelity, Vanguard, Coinbase, Robinhood, Webull)
- Standard account types (Brokerage, Roth IRA, Traditional IRA, 401k, HSA)
- 2024 and 2025 long-term capital gains tax brackets

Alternatively, use the **Settings** page in the app to add defaults after signing up.

#### c. Enable Email Auth

In your Supabase dashboard go to **Authentication > Providers** and make sure **Email** is enabled. For local dev, you can disable "Confirm email" under **Authentication > Email** settings.

#### d. Configure redirect URL

Under **Authentication > URL Configuration**, add your local URL to the allowed redirect list:

```
http://localhost:3000/**
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

Create an account, then use **Settings** to add brokers and account types before adding transactions.

---

## Database Schema Overview

| Table | Purpose |
|---|---|
| `profiles` | User display name, auto-created on signup |
| `brokers` | Broker definitions (Fidelity, etc.) |
| `account_types` | Account type definitions with tax treatment |
| `accounts` | User accounts linking broker + account_type |
| `assets` | Securities (ticker, name, type, price source) |
| `transactions` | All buy/sell records |
| `tax_lots` | Open lot tracking for FIFO |
| `realized_gains` | Closed lot records with gain/loss |
| `price_cache` | Latest prices per asset |
| `portfolio_snapshots` | Daily value snapshots for the chart |
| `import_batches` | CSV import history |
| `tax_rate_settings` | Long-term capital gains brackets by year |

Row Level Security is enabled on all tables — every row is scoped to the authenticated user.

---

## Deploying to Vercel

### Production URLs (already configured)

| Service | URL |
|---|---|
| **App (Vercel)** | https://investment-tracker-murex-rho.vercel.app |
| **GitHub repo** | https://github.com/Bindinsurance/investment-tracker |
| **Supabase project** | https://supabase.com/dashboard/project/zsjqupeygncbchkgxmup |
| **Supabase API** | https://zsjqupeygncbchkgxmup.supabase.co |

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/Bindinsurance/investment-tracker.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**
2. Import your GitHub repository
3. Vercel will auto-detect Next.js — no framework config needed

### 3. Add environment variables

In the Vercel project dashboard go to **Settings > Environment Variables** and add all variables from your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ALPHA_VANTAGE_API_KEY
TWELVE_DATA_API_KEY        (optional)
```

### 4. Configure Supabase redirect URL

After deploy, Vercel will give you a production URL like `https://your-app.vercel.app`. Add it to Supabase via the Management API or the Supabase dashboard:

**Authentication > URL Configuration > Site URL:**
```
https://investment-tracker-murex-rho.vercel.app
```

**Authentication > URL Configuration > Redirect URLs:**
```
https://investment-tracker-murex-rho.vercel.app/**
http://localhost:3000/**
```

> **Already configured** — these URLs were set via the Supabase Management API (`PATCH /v1/projects/zsjqupeygncbchkgxmup/config/auth`) on 2026-05-06.

### 5. Deploy

Click **Deploy**. Vercel will build and publish your app.

---

## Updating Prices

Prices are fetched from **Yahoo Finance** — no API key required.

To refresh manually:

1. Go to the **Assets** page and click the **Refresh Prices** button — fetches current prices for all your assets and reloads the page.
2. Or call the API directly: `POST /api/prices/update` (requires user session).

For automatic daily updates, the cron job is already configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/prices/update",
      "schedule": "0 21 * * 1-5"
    }
  ]
}
```

This runs at 4 PM ET (9 PM UTC) on weekdays after US market close. The cron sends a `GET` request — the route handles both `GET` (cron, verified via `CRON_SECRET`) and `POST` (UI button, verified via user session). Vercel Cron requires the Pro plan; on Hobby plan use the manual button.

---

## CSV Import Format

The CSV import supports any column order. During import you will map your CSV columns to these fields:

| Field | Required | Notes |
|---|---|---|
| Date | Yes | Any standard date format |
| Transaction Type | Yes | BUY, SELL, or DIVIDEND (case-insensitive) |
| Ticker | Yes | e.g. AAPL, BTC |
| Asset Name | No | Created automatically if new |
| Asset Type | No | STOCK, ETF, CRYPTO (default: STOCK) |
| Account | No | Matched by name; uses first account if blank |
| Quantity | Yes* | Required if Total Amount is blank; ignored for DIVIDEND |
| Unit Price | Yes* | Required if Total Amount is blank; set to 0 for DIVIDEND |
| Total Amount | Yes* | Required if Quantity + Price are blank |
| Fee | No | Defaults to 0 |

**Duplicate detection:** rows already present in the database are highlighted in amber in the preview step and automatically skipped on import. Detection is based on matching ticker + date + transaction type + quantity (±0.01%) + unit price (±0.01%). This check runs both client-side (preview badges) and server-side (safety net before insert), so re-importing the same file is always safe.

---

## Known Issues & Fixes Applied

This section documents every build error and runtime bug that occurred since initial deployment and how each was resolved. Useful for future developers or re-deploys.

### Runtime Fixes (Post-Deploy)

---

### Fix 5 — Prices showing "—" on Assets page (PostgREST join silently failing)

**Symptom:** Asset prices never appeared even though `price_cache` had data. Assets page showed "—" for all prices.

**Cause:** `assets/page.tsx` used a PostgREST embedded join (`select('*, price_cache(*)')`). This join silently returned empty results when Row Level Security on `price_cache` didn't match the join context, even though direct queries to `price_cache` worked fine.

**Fix:** Split into two separate queries — fetch assets, then fetch price_cache using `.in('asset_id', assetIds)` — and build a `priceMap` in TypeScript. Also added `export const dynamic = 'force-dynamic'` to prevent Next.js from caching the server component and serving stale data.

```typescript
// assets/page.tsx
export const dynamic = 'force-dynamic';

const { data: assets } = await supabase.from('assets').select('*').eq('user_id', user.id).order('ticker');
const assetIds = (assets ?? []).map((a: any) => a.id);
const { data: prices } = await supabase.from('price_cache').select('asset_id, current_price, updated_at').in('asset_id', assetIds);

const priceMap: Record<string, { current_price: number | null; updated_at: string | null }> = {};
for (const p of prices ?? []) { priceMap[p.asset_id] = { current_price: p.current_price, updated_at: p.updated_at }; }
const mapped = assetList.map((a: any) => ({ ...a, current_price: priceMap[a.id]?.current_price ?? null, price_updated_at: priceMap[a.id]?.updated_at ?? null }));
```

---

### Fix 6 — "Application error: a client-side exception" on CSV upload

**Symptom:** Opening the CSV import page or uploading a file crashed the entire app with a white error screen.

**Cause (found via browser console):** `Error: A <Select.Item /> must have a value prop that is not an empty string`. The column-mapping dropdowns had `<SelectItem value="">— skip —</SelectItem>`. Radix UI reserves the empty string internally for "no selection" and throws when any `<SelectItem>` uses it.

**Fix:** Changed skip option to `value="__skip__"` and converted back to `""` in the `onValueChange` handler:

```tsx
// import-client.tsx
<Select
  value={mapping[key] ?? '__skip__'}
  onValueChange={(v) => setMapping({ ...mapping, [key]: v === '__skip__' ? '' : v })}
>
  <SelectItem value="__skip__">— skip —</SelectItem>
  {/* other column options */}
</Select>
```

---

### Fix 7 — Dashboard crash when account or asset join returns null

**Symptom:** "Application error" on the dashboard after certain data operations (e.g., deleting an asset that had transactions).

**Cause:** `buildPortfolioPositions()` in `lib/calculations/portfolio.ts` accessed `account.broker?.name` and `asset.ticker` without null-checking the join results. If a transaction's account or asset was deleted or the join failed, accessing properties on `null` threw a TypeError.

**Fix:** Added null guard at the top of the grouping loop:

```typescript
// lib/calculations/portfolio.ts
for (const [, items] of grouped) {
  const { asset, account, priceCache } = items[0];
  if (!asset || !account) continue; // skip if join data missing
  // ... rest of calculation
}
```

---

### Fix 8 — Vercel Cron never updating prices (GET vs POST method mismatch)

**Symptom:** Prices were never auto-updated by the daily cron job even though `vercel.json` was configured correctly.

**Cause:** Vercel Cron sends `GET` requests, but `/api/prices/update` only had a `POST` handler. Every cron run returned 405 Method Not Allowed silently.

**Fix:** Added a `GET` handler that verifies the `CRON_SECRET` header (to prevent unauthorized access) and uses the service role client (to update all users' prices, not just one). The existing `POST` handler was kept for the manual UI button with user-session auth.

```typescript
// app/api/prices/update/route.ts
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = await createServiceClient();
  const result = await updateAllPrices(supabase as any); // all users
  return NextResponse.json(result);
}
```

---

### Fix 9 — New assets created via CSV import defaulted to Alpha Vantage (no API key)

**Symptom:** Assets imported via CSV never got price updates because they were created with `price_source: 'alphavantage'`, which requires an API key that isn't set.

**Cause:** The CSV import route hardcoded `price_source: 'alphavantage'` when creating new assets.

**Fix:** Changed to `price_source: 'manual'`, which the price provider maps to Yahoo Finance (free, no key needed):

```typescript
// app/api/import/csv/route.ts
await supabase.from('assets').insert({
  user_id: user.id,
  ticker: row.ticker,
  asset_type: 'stock',
  price_source: 'manual', // Yahoo Finance — was incorrectly 'alphavantage'
});
```

---

### Build / Deploy History

### Fix 1 — Map iteration requires ES2015+ target (`tsconfig.json`)

**Error (Vercel Build #4):**
```
lib/calculations/portfolio.ts:26:25 — Type 'Map<string, PositionInput[]>' can only be iterated
through when using '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
```

**Cause:** `tsconfig.json` had no explicit `target`, defaulting to ES3/ES5, which does not support `for...of` on `Map`.

**Fix:** Added `"target": "ES2017"` to `tsconfig.json` `compilerOptions`.

```json
{
  "compilerOptions": {
    "target": "ES2017"
  }
}
```

---

### Fix 2 — Implicit `any` in Supabase server client (`lib/supabase/server.ts`)

**Error (Vercel Build #5):**
```
lib/supabase/server.ts:15:16 — Parameter 'cookiesToSet' implicitly has an 'any' type.
```

**Cause:** `@supabase/ssr` v0.5.1 uses `strict: true` TypeScript; the `setAll` cookie method had no type annotation.

**Fix:** Added explicit type using `Parameters<>` utility to derive the options type directly from Next.js's `cookieStore.set`:

```typescript
setAll(cookiesToSet: {
  name: string;
  value: string;
  options: Parameters<typeof cookieStore.set>[2];
}[]) { ... }
```

---

### Fix 3 — Implicit `any` in middleware (`middleware.ts`)

**Error (Vercel Build #6):**
```
middleware.ts:15:16 — Parameter 'cookiesToSet' implicitly has an 'any' type.
```

**Cause:** Same issue as Fix 2 but in the middleware context, where cookies are set on both `request.cookies` and `supabaseResponse.cookies` (which have incompatible types).

**Fix:** Used `options: any` (acceptable here because the value is passed to two different cookie APIs):

```typescript
setAll(cookiesToSet: { name: string; value: string; options: any }[]) { ... }
```

---

### Fix 4 — "Database error saving new user" on signup

**Error (runtime — first signup attempt):**
```
Sign up failed
Database error saving new user
```

**Cause:** The `handle_new_user` trigger function was created without `SET search_path = public`. When Supabase Auth fires the trigger (running in the `auth` schema context), it cannot resolve the unqualified table name `profiles` and the insert fails.

**Fix:** Recreated the function with explicit schema qualifier and `SET search_path`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

Applied directly to the Supabase database via Management API on 2026-05-06. The migration file `001_initial_schema.sql` has also been updated to include this fix for future deployments.

---

### Build History

#### Initial deployment (build errors)

| Build | Commit | Result | Error fixed |
|---|---|---|---|
| #1–#3 | initial setup | ❌ Failed | Setup issues |
| #4 | `d4df693` | ❌ Failed | Map iteration (Fix 1) |
| #5 | `01453c7` | ❌ Failed | Implicit any server.ts (Fix 2) |
| #6 | `f6ca4a8` | ❌ Failed | Implicit any middleware.ts (Fix 3) |
| #7 | `f6ca4a8` | ✅ **SUCCESS** | All build errors resolved |

#### Post-deploy runtime fixes

| Session | Fix | Files changed |
|---|---|---|
| 2026-05-06 | Signup trigger `search_path` (Fix 4) | Supabase SQL directly |
| 2026-05-06 | Prices showing "—" — PostgREST join (Fix 5) | `assets/page.tsx` |
| 2026-05-06 | CSV import app crash — SelectItem empty value (Fix 6) | `import/import-client.tsx` |
| 2026-05-06 | Dashboard crash — null account/asset joins (Fix 7) | `lib/calculations/portfolio.ts` |
| 2026-05-06 | Cron GET vs POST (Fix 8) | `api/prices/update/route.ts` |
| 2026-05-06 | CSV import alphavantage default (Fix 9) | `api/import/csv/route.ts` |

#### Features added post-deploy

| Date | Feature | Files changed |
|---|---|---|
| 2026-05-06 | Yahoo Finance as default price source (no API key) | `lib/prices/provider.ts` |
| 2026-05-06 | Dividend transaction type (migration 003) | `supabase/migrations/003_add_dividend_type.sql`, `api/import/csv/route.ts`, `import-client.tsx` |
| 2026-05-06 | "Refresh Prices" button on Assets page | `assets/assets-client.tsx` |
| 2026-05-06 | Duplicate detection in CSV import (preview + server) | `import/import-client.tsx`, `import/page.tsx`, `api/import/csv/route.ts` |

---

## Tax Calculations Disclaimer

This app is for personal tracking purposes only. Tax calculations are estimates based on standard FIFO methodology and the tax brackets you configure. **This is not tax advice.** Consult a qualified tax professional before filing.

---

## License

MIT
