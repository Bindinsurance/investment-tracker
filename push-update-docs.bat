@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Update Docs
echo ==========================================
echo.

cd /d "%~dp0"

git add README.md
git add PRD.md

git commit -m "docs: update README and PRD with all post-deploy fixes and features

README.md:
- Fix 5: prices showing dash (PostgREST join -> separate queries + force-dynamic)
- Fix 6: CSV import app crash (SelectItem value='' -> '__skip__')
- Fix 7: dashboard crash from null account/asset joins
- Fix 8: Vercel cron GET vs POST method mismatch
- Fix 9: new CSV assets defaulting to alphavantage
- Updated Prerequisites: no API keys required (Yahoo Finance)
- Updated env vars: removed ALPHA_VANTAGE/TWELVE_DATA, added CRON_SECRET
- Updated Price Updates section: Refresh Prices button + GET/POST handlers
- Updated CSV Import: dividend type + duplicate detection details
- Added post-deploy runtime fix history table
- Added features added post-deploy table

PRD.md:
- 4.6 Assets: Yahoo Finance as price source, Refresh Prices button
- 4.7 Transactions: added Dividend type
- 4.9 Import CSV: two-layer duplicate detection details
- 4.12 Price Updates: GET handler for cron, CRON_SECRET
- Stack: removed Alpha Vantage/Twelve Data, added Yahoo Finance
- Env vars: removed ALPHA_VANTAGE/TWELVE_DATA, added CRON_SECRET
- Business rules: updated price chain
- Known limitations: updated cron and Yahoo Finance notes
- Backlog: marked Dividends as done
- Section 6: added migration 003
- Section 13 (new): full implementation history"

git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! README e PRD atualizados.
echo ==========================================
echo.
pause
