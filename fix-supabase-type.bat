@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix Supabase type
echo ==========================================
echo.

cd /d "%~dp0"

git add "lib/supabase/server.ts"
git commit -m "fix: add explicit type to setAll cookiesToSet parameter"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO!
echo ==========================================
echo.
pause
