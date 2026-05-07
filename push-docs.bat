@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Push documentacao
echo ==========================================
echo.

cd /d "%~dp0"

git add README.md DEPLOY-GUIDE.md PRD.md
git commit -m "docs: add PRD, update README with fixes and production URLs"
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO!
echo ==========================================
echo.
pause
