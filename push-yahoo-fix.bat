@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix Yahoo Finance
echo ==========================================
echo.

cd /d "%~dp0"

git add lib/prices/provider.ts
git add "app/(dashboard)/assets/assets-client.tsx"
git commit -m "fix: Yahoo Finance as default price source for stocks/ETFs

- provider.ts: source='manual' or no source -> Yahoo Finance directly (no API key needed)
- provider.ts: source='alphavantage' only uses Alpha Vantage if key is configured, else falls back to Yahoo
- assets-client.tsx: default price source changed from 'alphavantage' to 'manual' (Yahoo Finance)
- assets-client.tsx: Price Source dropdown now shows 'Yahoo Finance (Free)' as first option"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Aguarde o Vercel (~2 min).
echo  Depois edite o AAPL e mude Price Source
echo  para "Yahoo Finance (Free)" e clique Update.
echo ==========================================
echo.
pause
