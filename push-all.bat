@echo off
chcp 65001 > nul

:: ============================================================
:: push-all.bat — Investment Tracker
:: Faz git add de tudo, commit com mensagem passada como
:: argumento (ou mensagem padrão) e push para origin main.
::
:: Uso:
::   push-all.bat "feat: descricao da mudanca"
::   push-all.bat              (usa mensagem automatica com timestamp)
:: ============================================================

cd /d "%~dp0"

:: Verificar se há algo para commitar
git status --porcelain > nul 2>&1
git diff --quiet --cached 2>nul
git diff --quiet 2>nul

:: Montar mensagem de commit
if "%~1"=="" (
    for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set DATA=%%c-%%b-%%a
    for /f "tokens=1-2 delims=: " %%a in ('time /t') do set HORA=%%a:%%b
    set MSG=chore: update %DATA% %HORA%
) else (
    set MSG=%~1
)

echo.
echo ==========================================
echo  Investment Tracker - Push to GitHub
echo ==========================================
echo.
echo  Commit: %MSG%
echo.

git add .

git diff --cached --quiet
if %errorlevel%==0 (
    echo  Nenhuma alteracao para commitar.
    echo ==========================================
    echo.
    pause
    exit /b 0
)

git commit -m "%MSG%"
if %errorlevel% neq 0 (
    echo.
    echo  ERRO no commit. Verifique acima.
    pause
    exit /b 1
)

git push origin main
if %errorlevel% neq 0 (
    echo.
    echo  ERRO no push. Verifique sua conexao ou credenciais.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  CONCLUIDO! Vercel vai deployar em ~2 min.
echo  https://investment-tracker-murex-rho.vercel.app
echo ==========================================
echo.
