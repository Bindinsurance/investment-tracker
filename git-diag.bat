@echo off
chcp 65001 > nul
cd /d "%~dp0"

(
echo === GIT STATUS ===
git status

echo.
echo === GIT DIFF HEAD transactions page ===
git diff HEAD -- "app/(dashboard)/transactions/page.tsx"

echo.
echo === FILE CONTENT (limit lines) ===
type "app\(dashboard)\transactions\page.tsx" | findstr /i "limit order"

echo.
echo === GIT LOG (last 3 commits) ===
git log --oneline -3

echo.
echo === GIT ROOT ===
git rev-parse --show-toplevel

) > git-diag-output.txt 2>&1

echo Diagnostico salvo em git-diag-output.txt
timeout /t 3
