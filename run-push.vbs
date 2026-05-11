Dim oShell, projectDir, cmd
Set oShell = CreateObject("WScript.Shell")

projectDir = "C:\Users\agent1\Downloads\App_ Controle de investimentos\App de controle de investimentos"

cmd = "cmd.exe /c cd /d """ & projectDir & """ && " & _
      "git update-index --no-skip-worktree ""app/(dashboard)/transactions/page.tsx"" & " & _
      "git update-index --no-assume-unchanged ""app/(dashboard)/transactions/page.tsx"" & " & _
      "git add . & " & _
      "git commit -m ""fix: override PostgREST 1000-row default with .limit(5000)"" & " & _
      "git push origin main"

oShell.Run cmd, 1, True
MsgBox "Push concluido! Verifique o GitHub.", 64, "Investment Tracker"
