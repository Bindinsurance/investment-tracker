@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix CSV Import
echo ==========================================
echo.

cd /d "%~dp0"

git add "app/(dashboard)/import/import-client.tsx"

git commit -m "fix: CSV import crash - SelectItem value cannot be empty string

Radix UI Select throws when a SelectItem has value=''.
Changed skip option to value='__skip__' and handle conversion in onValueChange.
This was causing 'Application error: a client-side exception' on CSV upload."

git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Aguarde o Vercel (~2 min).
echo  Depois tente importar o CSV novamente.
echo ==========================================
echo.
pause
