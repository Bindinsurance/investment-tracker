@echo off
cd /d "C:\Users\agent1\Downloads\App_ Controle de investimentos\App de controle de investimentos"
echo === GIT STATUS ===
git status
echo.
echo === GIT DIFF (unstaged) ===
git diff --stat
echo.
echo === GIT DIFF CACHED (staged) ===
git diff --cached --stat
echo.
pause
