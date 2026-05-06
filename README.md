# Investment Tracker

A personal investment portfolio tracker for stocks, ETFs, and cryptocurrencies. Supports multiple brokers and account types, FIFO tax-lot tracking, CSV import, and PDF/CSV reports.

---

## Features

- **Portfolio Dashboard** — real-time value, unrealized/realized P&L, allocation charts
- **Multi-Broker, Multi-Account** — Roth IRA, Brokerage, 401k, and more
- **Buy & Sell Transactions** — FIFO tax-lot engine, short-term vs long-term classification
- **CSV Import** — bulk import from any broker with column mapping
- **Tax Reports** — realized gains with cost basis, holding period, and estimated tax
- **Price Updates** — Alpha Vantage (stocks/ETFs) and CoinGecko (crypto)
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
- API keys (optional but recommended):
  - [Alpha Vantage](https://www.alphavantage.co/support/#api-key) — free, 25 req/day
  - [Twelve Data](https://twelvedata.com/pricing) — free, 800 req/day (alternative)
  - CoinGecko is used without a key for crypto

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

# Price providers — add at least one for stock/ETF prices
ALPHA_VANTAGE_API_KEY=your_key_here
TWELVE_DATA_API_KEY=your_key_here   # optional alternative
```

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

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/investment-tracker.git
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

After deploy, Vercel will give you a production URL like `https://your-app.vercel.app`. Add it to Supabase:

**Authentication > URL Configuration > Redirect URLs:**
```
https://your-app.vercel.app/**
```

### 5. Deploy

Click **Deploy**. Vercel will build and publish your app.

---

## Updating Prices

Prices are not updated automatically. To refresh:

1. On the **Dashboard**, click the **Update Prices** button — this fetches current prices for all your assets and saves a daily portfolio snapshot.
2. Or call the API directly: `POST /api/prices/update` (authenticated).

For automatic updates, set up a Vercel Cron Job in `vercel.json`:

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

This runs at 4 PM ET (9 PM UTC) on weekdays after US market close. Vercel Cron requires the Pro plan.

---

## CSV Import Format

The CSV import supports any column order. During import you will map your CSV columns to these fields:

| Field | Required | Notes |
|---|---|---|
| Date | Yes | Any standard date format |
| Transaction Type | Yes | BUY or SELL (case-insensitive) |
| Ticker | Yes | e.g. AAPL, BTC |
| Asset Name | No | Created automatically if new |
| Asset Type | No | STOCK, ETF, CRYPTO (default: STOCK) |
| Account | No | Matched by name; uses first account if blank |
| Quantity | Yes* | Required if Total Amount is blank |
| Unit Price | Yes* | Required if Total Amount is blank |
| Total Amount | Yes* | Required if Quantity + Price are blank |
| Fee | No | Defaults to 0 |

Duplicate detection is based on matching date + ticker + quantity + type within 1 cent.

---

## Tax Calculations Disclaimer

This app is for personal tracking purposes only. Tax calculations are estimates based on standard FIFO methodology and the tax brackets you configure. **This is not tax advice.** Consult a qualified tax professional before filing.

---

## License

MIT
