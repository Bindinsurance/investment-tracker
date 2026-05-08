@echo off
cd /d "C:\Users\agent1\Downloads\App_ Controle de investimentos\App de controle de investimentos"
echo === RECENT COMMITS ===
git log --oneline -8
echo.
echo === LAST COMMIT DETAILS ===
git show --stat HEAD
echo.
pause
