@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix prices + import
echo ==========================================
echo.

cd /d "%~dp0"

git add lib/prices/provider.ts
git add app/(dashboard)/import/import-client.tsx
git commit -m "fix: add Yahoo Finance fallback for prices + robust CSV import error handling"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Aguarde o Vercel fazer deploy
echo  (~2 min) e teste novamente.
echo ==========================================
echo.
pause
