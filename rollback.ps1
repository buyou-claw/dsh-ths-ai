# Roll back dsh-ths-ai registration if DSH desktop does not start normally.
# This only removes the plugin registration; it does not touch your 同花顺 data.
$ErrorActionPreference = 'Stop'
$profile = Join-Path $env:USERPROFILE '.dsh\profiles\desktop'
$pkg = Join-Path $profile 'package.json'
$bak = "$pkg.bak-ths-ai"
$link = Join-Path $profile 'node_modules\dsh-ths-ai'

if (Test-Path -LiteralPath $bak) {
  Copy-Item -LiteralPath $bak -Destination $pkg -Force
  Write-Host "restored $pkg"
} else {
  Write-Warning "backup not found: $bak"
}

if (Test-Path -LiteralPath $link) {
  $item = Get-Item -LiteralPath $link -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    cmd /c rmdir "$link"
    Write-Host "removed junction $link"
  } else {
    Write-Warning "not a junction, left untouched: $link"
  }
}

Write-Host 'Rollback done. Restart DSH desktop.'
