@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Dividend Support
echo ==========================================
echo.

cd /d "%~dp0"

git add types/index.ts
git add app/(dashboard)/import/import-client.tsx
git add app/api/import/csv/route.ts
git add app/(dashboard)/transactions/transactions-client.tsx
git add app/api/reports/route.ts
git add supabase/migrations/003_add_dividend_type.sql
git commit -m "feat: add dividend transaction type support

- Add 'dividend' to TransactionType in types/index.ts
- parseAction() now recognizes dividend keywords (dividend, div reinv, qualified div)
- buildPreview() validates dividends by total_amount instead of qty/price
- CSV import API: Zod schema allows dividend type with qty/price >= 0
- CSV import API: dividends skip tax lot and FIFO, stored with qty=0 price=0
- Transactions table: Dividend filter + blue badge
- Reports API: adds total_dividends and dividend_count to summary
- DB migration 003: relaxes constraints to allow qty/price = 0"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Aguarde o Vercel (~2 min).
echo ==========================================
echo.
pause
