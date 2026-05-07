@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Import + UI Fixes
echo ==========================================
echo.

cd /d "%~dp0"

git add "app/(dashboard)/import/import-client.tsx"
git add "app/api/import/csv/route.ts"
git add "app/api/assets/merge/route.ts"
git add "app/(dashboard)/assets/assets-client.tsx"
git add "app/(dashboard)/transactions/transactions-client.tsx"
git add "types/index.ts"
git add "supabase/migrations/004_add_fee_type.sql"
git add "README.md"
git add "PRD.md"
git add "CLAUDE.md"

git commit -m "feat: CSV import + transaction UI improvements

import-client.tsx:
- REINVESTMENT mapped as buy (Fidelity DRIP)
- FEE CHARGED mapped as new fee type
- Fee rows validated by total_amount only (no qty/price required)
- Type badges: orange for fee, colored per type in preview

csv/route.ts:
- Accept fee as valid transaction_type
- Fee/dividend rows: quantity=0, skip FIFO
- Handle missing ticker for fee rows
- Duplicate check skipped for ticker-less fees

types/index.ts:
- TransactionType union updated: added fee

supabase/migrations/004_add_fee_type.sql:
- ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'fee'

assets/assets-client.tsx + api/assets/merge/route.ts:
- Detect ticker conflict on edit (unique constraint)
- Offer merge dialog: reassign all transactions/lots/gains to existing asset
- POST /api/assets/merge: moves transactions, tax_lots, realized_gains, deletes source

transactions-client.tsx:
- Edit button (pencil icon) on every transaction row
- Edit modal: date, qty, price, total, fee, notes
- Date range filter (from/to) across all transaction types
- Total bar: sum of filtered transactions shown when any filter active
- Fee type added to type filter dropdown
- Colored badges for all 4 types (buy/sell/dividend/fee)

docs: README and PRD updated with all new features"

git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Vercel deploying (~2 min).
echo.
echo  IMPORTANTE: Execute a migration no Supabase:
echo  supabase/migrations/004_add_fee_type.sql
echo  (SQL Editor no dashboard do Supabase)
echo ==========================================
echo.
pause
