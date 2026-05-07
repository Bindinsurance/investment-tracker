@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix Prices + Errors
echo ==========================================
echo.

cd /d "%~dp0"

git add app/(dashboard)/assets/page.tsx
git add app/(dashboard)/assets/assets-client.tsx
git add app/api/prices/update/route.ts
git add app/api/import/csv/route.ts
git add lib/calculations/portfolio.ts

git commit -m "fix: prices not showing + application error crashes

- assets/page.tsx: force-dynamic + separate price_cache query (JOIN was silently failing)
- assets-client.tsx: add Refresh Prices button with error reporting
- prices/update/route.ts: GET handler for Vercel cron + better error messages
- import/csv/route.ts: new assets default to manual (Yahoo Finance) not alphavantage
- portfolio.ts: null-check account/asset joins to prevent dashboard crash"

git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Aguarde o Vercel (~2 min).
echo.
echo  Depois:
echo  1. Va para a pagina Assets
echo  2. Clique em "Refresh Prices"
echo  3. Aguarde a mensagem de sucesso
echo  4. Os valores apareceram na tabela
echo ==========================================
echo.
pause
