@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix tsconfig target
echo ==========================================
echo.

cd /d "%~dp0"

git add tsconfig.json
git commit -m "fix: add target ES2017 to tsconfig for Map iteration support"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO!
echo ==========================================
echo.
pause
