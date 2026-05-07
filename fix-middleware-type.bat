@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix middleware type
echo ==========================================
echo.

cd /d "%~dp0"

git add middleware.ts
git commit -m "fix: add explicit type to middleware setAll cookiesToSet parameter"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO!
echo ==========================================
echo.
pause
