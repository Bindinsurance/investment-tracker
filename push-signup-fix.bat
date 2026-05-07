@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix signup trigger
echo ==========================================
echo.

cd /d "%~dp0"

git add supabase/migrations/001_initial_schema.sql README.md
git commit -m "fix: add SET search_path=public to handle_new_user trigger function"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO!
echo ==========================================
echo.
pause
