@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Fix next.config
echo ==========================================
echo.

cd /d "%~dp0"

echo Adicionando next.config.mjs...
git add next.config.mjs

echo Removendo next.config.ts do git (mantendo arquivo local)...
git rm --cached next.config.ts

echo Fazendo commit...
git commit -m "fix: replace next.config.ts with next.config.mjs for Vercel compatibility"

echo Enviando para GitHub...
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Fix enviado ao GitHub.
echo ==========================================
echo.
pause
