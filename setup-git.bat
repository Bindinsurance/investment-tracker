@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Deploy para GitHub
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/5] Removendo git anterior (se existir)...
if exist ".git" rmdir /s /q .git

echo [2/5] Inicializando repositorio...
git init -b main

echo [3/5] Configurando identidade...
git config user.email "bindinsuranceus@gmail.com"
git config user.name "Bindinsurance"

echo [4/5] Adicionando todos os arquivos...
git add .
git commit -m "feat: Investment Tracker completo - FIFO, Supabase, Recharts"

echo [5/5] Conectando ao GitHub e enviando...
git remote add origin https://github.com/Bindinsurance/investment-tracker.git
git push -u origin main --force

echo.
echo ==========================================
echo  PRONTO! Vercel vai fazer o deploy agora.
echo  Acesse: https://investment-tracker.vercel.app
echo ==========================================
echo.
pause
