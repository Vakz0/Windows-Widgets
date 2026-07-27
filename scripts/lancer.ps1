$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$electron = Join-Path $root 'node_modules\electron\dist\electron.exe'
$mainJs = Join-Path $root 'dist-electron\main.js'
$distHtml = Join-Path $root 'dist\index.html'

function Get-LatestWriteTime([string[]]$Paths) {
  $latest = [datetime]::MinValue
  foreach ($p in $Paths) {
    if (-not (Test-Path $p)) { continue }
    Get-ChildItem -Path $p -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch '\\(node_modules|dist|dist-electron|release|bin|obj|publish|\.git)\\' } |
      ForEach-Object {
        if ($_.LastWriteTime -gt $latest) { $latest = $_.LastWriteTime }
      }
  }
  return $latest
}

function Needs-Rebuild {
  if (-not (Test-Path $mainJs) -or -not (Test-Path $distHtml)) { return $true }
  $builtAt = (Get-Item $mainJs).LastWriteTime
  $srcLatest = Get-LatestWriteTime @(
    (Join-Path $root 'src'),
    (Join-Path $root 'electron'),
    (Join-Path $root 'index.html'),
    (Join-Path $root 'vite.config.ts'),
    (Join-Path $root 'package.json')
  )
  return ($srcLatest -gt $builtAt)
}

if (-not (Test-Path $electron)) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show(
    "Electron est introuvable.`nLance une fois Preparer-lancement.bat (npm install).",
    'Lattice',
    'OK',
    'Error'
  ) | Out-Null
  exit 1
}

if (Needs-Rebuild) {
  Add-Type -AssemblyName PresentationFramework | Out-Null
  [System.Windows.MessageBox]::Show(
    "Mise a jour detectee.`nL'application va se recompiler puis demarrer.",
    'Lattice',
    'OK',
    'Information'
  ) | Out-Null

  $build = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','build' -WorkingDirectory $root -Wait -PassThru -WindowStyle Minimized
  if ($build.ExitCode -ne 0) {
    [System.Windows.MessageBox]::Show(
      "Echec du build. Ouvre un terminal et lance : npm run build",
      'Lattice',
      'OK',
      'Error'
    ) | Out-Null
    exit 1
  }
}

Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $root -WindowStyle Normal
