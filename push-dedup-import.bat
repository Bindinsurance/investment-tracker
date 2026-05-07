@echo off
chcp 65001 > nul
echo.
echo ==========================================
echo  Investment Tracker - Duplicate Detection
echo ==========================================
echo.

cd /d "%~dp0"

git add "app/(dashboard)/import/import-client.tsx"
git add "app/(dashboard)/import/page.tsx"
git add app/api/import/csv/route.ts

git commit -m "feat: duplicate detection for CSV import

- import/page.tsx: fetch existing transactions and pass to ImportClient
- import-client.tsx: mark rows as isDuplicate in preview (checked against existing transactions)
- import-client.tsx: show duplicate count badge in preview step
- import-client.tsx: success toast shows how many duplicates were skipped
- csv/route.ts: server-side duplicate check before inserting (safety net)
- csv/route.ts: return duplicates count in response"

git push origin main

echo.
echo ==========================================
echo  CONCLUIDO! Aguarde o Vercel (~2 min).
echo.
echo  Agora ao importar o mesmo arquivo 2x:
echo  - Novas transacoes: serao importadas
echo  - Duplicatas: serao mostradas em amarelo
echo    e ignoradas automaticamente
echo ==========================================
echo.
pause
