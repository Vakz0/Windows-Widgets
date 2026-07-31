$ErrorActionPreference = 'Stop'

# Ce script est dans <projet>/scripts/
$root = Split-Path -Parent $PSScriptRoot
$vbs = Join-Path $root 'Lancer-Lattice.vbs'
$iconPng = Join-Path $root 'assets\icon.png'
$iconIco = Join-Path $root 'assets\icon.ico'
$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'

if (-not (Test-Path $vbs)) {
  throw "Lancer-Lattice.vbs introuvable dans $root"
}

if ((Test-Path $iconPng) -and -not (Test-Path $iconIco)) {
  try {
    Add-Type -AssemblyName System.Drawing
    $img = [System.Drawing.Image]::FromFile($iconPng)
    $size = 256
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $size, $size)

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $ms.ToArray()
    $ms.Dispose()

    # Minimal ICO wrapper around PNG (Vista+)
    $header = New-Object byte[] 6
    $header[0] = 0; $header[1] = 0; $header[2] = 1; $header[3] = 0; $header[4] = 1; $header[5] = 0
    $entry = New-Object byte[] 16
    $entry[0] = 0; $entry[1] = 0; $entry[2] = 0; $entry[3] = 0
    $entry[4] = 1; $entry[5] = 0; $entry[6] = 32; $entry[7] = 0
    [BitConverter]::GetBytes([int]$pngBytes.Length).CopyTo($entry, 8)
    [BitConverter]::GetBytes([int]22).CopyTo($entry, 12)
    [IO.File]::WriteAllBytes($iconIco, ($header + $entry + $pngBytes))

    $g.Dispose(); $bmp.Dispose(); $img.Dispose()
  } catch {
    Write-Host "Icone .ico non generee (pas grave) : $($_.Exception.Message)"
  }
}

function New-WidgetShortcut([string]$Path) {
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $wscript
  $shortcut.Arguments = "//nologo `"$vbs`""
  $shortcut.WorkingDirectory = $root
  $shortcut.WindowStyle = 7
  $shortcut.Description = 'Lattice — composable desktop widgets'
  if (Test-Path $iconIco) {
    $shortcut.IconLocation = "$iconIco,0"
  } elseif (Test-Path $electron) {
    $shortcut.IconLocation = "$electron,0"
  }
  $shortcut.Save()
  Write-Host "Raccourci cree : $Path"
}

$desktop = [Environment]::GetFolderPath('Desktop')
$startMenu = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'

New-WidgetShortcut (Join-Path $desktop 'Lattice.lnk')
New-WidgetShortcut (Join-Path $startMenu 'Lattice.lnk')

Write-Host ''
Write-Host 'OK — lance l app via le raccourci Bureau ou menu Demarrer.'
Write-Host 'Astuce : dans le systray, active "Lancer au demarrage".'
