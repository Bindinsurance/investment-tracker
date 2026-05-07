@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix jsPDF import
echo ==========================================
echo.

cd /d "%~dp0"

git add "app/(dashboard)/reports/reports-client.tsx"
git commit -m "fix: correct jsPDF dynamic import for TypeScript compatibility"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO!
echo ==========================================
echo.
pause
