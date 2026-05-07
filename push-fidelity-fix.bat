@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix Fidelity CSV
echo ==========================================
echo.

cd /d "%~dp0"

git add "app/(dashboard)/import/import-client.tsx"
git commit -m "fix: handle Fidelity negative quantity/amount in CSV import"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Aguarde ~2 min e teste.
echo ==========================================
echo.
pause
