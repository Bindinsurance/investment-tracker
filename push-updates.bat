@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Push de atualizacoes
echo ==========================================
echo.

cd /d "%~dp0"

echo Adicionando novos arquivos...
git add app/(auth)/login/page.tsx
git add vercel.json
git add DEPLOY-GUIDE.md

echo Fazendo commit...
git commit -m "feat: add signup page, vercel.json cron, deploy guide"

echo Enviando para GitHub...
git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Arquivos enviados ao GitHub.
echo ==========================================
echo.
pause
