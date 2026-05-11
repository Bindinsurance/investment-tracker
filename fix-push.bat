@echo off
chcp 65001 > nul
cd /d "%~dp0"

echo.
echo ==========================================
echo  Forcing git add of transactions page.tsx
echo ==========================================
echo.

git add "app/(dashboard)/transactions/page.tsx"

echo === GIT STATUS ===
git status

echo.
echo === GIT DIFF STAGED ===
git diff --cached -- "app/(dashboard)/transactions/page.tsx"

echo.
git diff --cached --quiet
if %errorlevel%==0 (
    echo  Nenhuma mudanca staged — arquivo pode estar identico ao HEAD.
    echo  Verificando conteudo do arquivo:
    type "app\(dashboard)\transactions\page.tsx" | findstr "limit"
) else (
    echo  Mudanca detectada! Commitando...
    git commit -m "fix: override PostgREST 1000-row default with .limit(5000)"
    git push origin main
    echo.
    echo ==========================================
    echo  CONCLUIDO! Vercel vai deployar em ~2 min.
    echo ==========================================
)

echo.
pause
