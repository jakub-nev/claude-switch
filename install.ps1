# claude-switch installer for Windows.
#   Install:    double-click install.cmd   (or: powershell -ExecutionPolicy Bypass -File install.ps1)
#   Uninstall:  powershell -ExecutionPolicy Bypass -File install.ps1 -Uninstall
param([switch]$Uninstall, [switch]$NoTray)
$ErrorActionPreference = 'Stop'

$app      = Join-Path $env:LOCALAPPDATA 'claude-switch'
$bin      = Join-Path $HOME '.local\bin'
$shim     = Join-Path $bin 'claude-switch.cmd'
$programs = [Environment]::GetFolderPath('Programs')
$startup  = [Environment]::GetFolderPath('Startup')
$menuLnk  = Join-Path $programs 'claude-switch.lnk'
$trayLnk  = Join-Path $startup 'claude-switch tray.lnk'

function Update-SessionPath { $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User') }
function Test-Cmd($n) { [bool](Get-Command $n -ErrorAction SilentlyContinue) }
function Stop-Tray { Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*claude-switch*tray.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }

if ($Uninstall) {
  if (Test-Cmd node) { & node (Join-Path $app 'claude-switch.js') auto off 2>$null | Out-Null }
  Stop-Tray
  Remove-Item $menuLnk, $trayLnk, $shim -Force -ErrorAction SilentlyContinue
  Remove-Item $app -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host "claude-switch removed. Your saved logins are still in $HOME\.claude-accounts (delete that folder to forget them)."
  return
}

Write-Host "`nclaude-switch setup" -ForegroundColor Cyan
if (-not (Test-Cmd node)) {
  Write-Host 'Installing Node.js (needed to run claude-switch)...'
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  Update-SessionPath
}
if (-not (Test-Cmd claude)) {
  Write-Host 'Installing Claude Code...'
  Invoke-RestMethod https://claude.ai/install.ps1 | Invoke-Expression
  Update-SessionPath
}
foreach ($n in 'node', 'claude') { if (-not (Test-Cmd $n)) { throw "$n is missing. Install it, then run this setup again." } }

# Copy the app.
Stop-Tray
New-Item -ItemType Directory -Force $app, $bin | Out-Null
foreach ($f in 'claude-switch.js', 'ui.html', 'tray.ps1', 'launch.vbs') { Copy-Item (Join-Path $PSScriptRoot $f) $app -Force }
Copy-Item (Join-Path $PSScriptRoot 'assets') $app -Recurse -Force

# Command on PATH.
[IO.File]::WriteAllText($shim, "@node `"$app\claude-switch.js`" %*`r`n")
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $bin) { [Environment]::SetEnvironmentVariable('Path', "$userPath;$bin", 'User') }

# Start menu entry and tray at sign-in (both launch hidden through launch.vbs).
$shell = New-Object -ComObject WScript.Shell
function New-Shortcut($path, $arg, $desc) {
  $l = $shell.CreateShortcut($path)
  $l.TargetPath = "$env:SystemRoot\System32\wscript.exe"
  $l.Arguments = "`"$app\launch.vbs`" $arg"
  $l.WorkingDirectory = $app
  $l.Description = $desc
  $l.IconLocation = "$env:SystemRoot\System32\shell32.dll,44"
  $l.Save()
}
New-Shortcut $menuLnk 'window' 'Switch Claude Code between your Claude accounts'
if (-not $NoTray) {
  New-Shortcut $trayLnk 'tray' 'claude-switch tray icon'
  Start-Process "$env:SystemRoot\System32\wscript.exe" "`"$app\launch.vbs`" tray"
}

Write-Host "`nInstalled." -ForegroundColor Green
Write-Host ('  Window:   Start menu > claude-switch' + $(if ($NoTray) { '' } else { ', or click the tray icon' }))
Write-Host '  Terminal: claude-switch help   (open a new terminal first)'
Start-Process "$env:SystemRoot\System32\wscript.exe" "`"$app\launch.vbs`" window"
