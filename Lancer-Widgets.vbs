' Lance Windows Widgets — reconstruit auto si le code a change
Option Explicit

Dim sh, fso, root, ps1, cmd

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

root = fso.GetParentFolderName(WScript.ScriptFullName)
ps1 = root & "\scripts\lancer.ps1"

If Not fso.FileExists(ps1) Then
  MsgBox "scripts\lancer.ps1 introuvable.", vbCritical, "Windows Widgets"
  WScript.Quit 1
End If

' 1 = fenêtre normale seulement si build nécessaire (le script gère)
' On utilise 0 pour cacher ; si rebuild, le script peut quand même écrire
cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & ps1 & """"
sh.CurrentDirectory = root
sh.Run cmd, 0, False
