@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix JSX token error
echo ==========================================
echo.

cd /d "%~dp0"

git add "app/(dashboard)/settings/settings-client.tsx"
git commit -m "fix: escape JSX > token in settings tax table"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO!
echo ==========================================
echo.
pause
