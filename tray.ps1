# claude-switch tray icon (Windows). Started at sign-in by the installer.
# Left-click opens the window; right-click lists accounts to switch to.
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$ErrorActionPreference = 'SilentlyContinue'
$js = Join-Path $PSScriptRoot 'claude-switch.js'

# One tray per user session.
$mutex = New-Object System.Threading.Mutex($false, 'Local\claude-switch-tray')
if (-not $mutex.WaitOne(0)) { exit }

function Invoke-Switch([string[]]$a) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo 'node'
  $psi.Arguments = (@("`"$js`"") + ($a | ForEach-Object { "`"$_`"" })) -join ' '
  $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true
  $psi.StandardOutputEncoding = [Text.Encoding]::UTF8
  $p = [Diagnostics.Process]::Start($psi)
  $out = $p.StandardOutput.ReadToEnd(); $err = $p.StandardError.ReadToEnd(); $p.WaitForExit()
  [pscustomobject]@{ Ok = ($p.ExitCode -eq 0); Out = $out.Trim(); Err = $err.Trim() }
}

function Open-Window { Start-Process node -ArgumentList "`"$js`" ui" -WindowStyle Hidden }

# Icon: a brass-rimmed jack with the red cord ring, drawn at runtime.
function New-JackIcon([bool]$live) {
  $bmp = New-Object Drawing.Bitmap 32, 32
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.FillEllipse((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(59, 42, 32))), 1, 1, 30, 30)
  $ring = if ($live) { [Drawing.Color]::FromArgb(194, 59, 42) } else { [Drawing.Color]::FromArgb(184, 138, 59) }
  $g.DrawEllipse((New-Object Drawing.Pen $ring, 5), 8, 8, 16, 16)
  $g.FillEllipse((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(23, 18, 16))), 10.5, 10.5, 11, 11)
  $g.Dispose()
  [Drawing.Icon]::FromHandle($bmp.GetHicon())
}

$tray = New-Object Windows.Forms.NotifyIcon
$tray.Icon = New-JackIcon $true
$tray.Text = 'claude-switch'
$tray.Visible = $true
$menu = New-Object Windows.Forms.ContextMenuStrip
$tray.ContextMenuStrip = $menu

function Update-Menu {
  $menu.Items.Clear()
  $r = Invoke-Switch @('list', '--json')
  $state = $null
  if ($r.Ok) { $state = $r.Out | ConvertFrom-Json }
  if (-not $state -or -not $state.accounts) {
    [void]$menu.Items.Add('No accounts yet. Open the window to add one.')
  } else {
    foreach ($a in $state.accounts) {
      $label = "$($a.name)   $($a.email)"
      if ($a.limitedUntil) { $label += '   (resting until ' + ([DateTimeOffset]::FromUnixTimeMilliseconds([int64]$a.limitedUntil).LocalDateTime.ToString('HH:mm')) + ')' }
      $item = New-Object Windows.Forms.ToolStripMenuItem $label
      $item.Checked = [bool]$a.active
      $item.Tag = $a.name
      $item.add_Click({
        param($s)
        $res = Invoke-Switch @($s.Tag)
        $msg = if ($res.Ok) { $res.Out } else { $res.Err }
        $tray.ShowBalloonTip(3000, 'claude-switch', $msg, 'None')
      })
      [void]$menu.Items.Add($item)
    }
    $tray.Text = 'claude-switch: ' + (($state.accounts | Where-Object active | Select-Object -First 1).name)
  }
  [void]$menu.Items.Add((New-Object Windows.Forms.ToolStripSeparator))
  $auto = New-Object Windows.Forms.ToolStripMenuItem 'Switch automatically when a limit is hit'
  $auto.Checked = [bool]($state -and $state.autoSwitch)
  $auto.add_Click({ param($s); [void](Invoke-Switch @('auto', $(if ($s.Checked) { 'off' } else { 'on' }))) })
  [void]$menu.Items.Add($auto)
  $open = New-Object Windows.Forms.ToolStripMenuItem 'Open claude-switch'
  $open.Font = New-Object Drawing.Font($open.Font, [Drawing.FontStyle]::Bold)
  $open.add_Click({ Open-Window })
  [void]$menu.Items.Add($open)
  $quit = New-Object Windows.Forms.ToolStripMenuItem 'Quit tray icon'
  $quit.add_Click({ $tray.Visible = $false; [Windows.Forms.Application]::Exit() })
  [void]$menu.Items.Add($quit)
}

$menu.add_Opening({ Update-Menu })
$tray.add_MouseClick({ param($s, $e); if ($e.Button -eq 'Left') { Open-Window } })
Update-Menu
[Windows.Forms.Application]::Run()
$tray.Dispose()
$mutex.ReleaseMutex()
