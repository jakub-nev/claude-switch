' Starts claude-switch without a console window.  Usage: launch.vbs window|tray
Set sh = CreateObject("WScript.Shell")
dir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
mode = "window"
If WScript.Arguments.Count > 0 Then mode = WScript.Arguments(0)
If mode = "tray" Then
  sh.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\tray.ps1""", 0, False
Else
  sh.Run "node """ & dir & "\claude-switch.js"" ui", 0, False
End If
