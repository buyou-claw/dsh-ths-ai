#Requires -Version 5.1
<#
.SYNOPSIS
  把 dsh-ths-ai 接入 DSH 桌面端 profile（幂等，可重复运行）。

.DESCRIPTION
  1) 备份 profile/package.json -> package.json.bak-ths-ai
  2) 写入 dependencies["dsh-ths-ai"] = "file:../../plugins/dsh-ths-ai"
  3) 把 "dsh-ths-ai" 追加进 dsh.profile.bundles
  4) 在 profile/node_modules 下建立目录联接（不跑 npm install，避免重装整个依赖树）

  完成后需要【完全退出】并重启 DSH 桌面端。

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File install\install.ps1
  powershell -ExecutionPolicy Bypass -File install\install.ps1 -DryRun
  powershell -ExecutionPolicy Bypass -File install\install.ps1 -Uninstall
#>
[CmdletBinding()]
param(
  [switch]$Uninstall,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$PluginId   = 'dsh-ths-ai'
$PluginDir  = Split-Path -Parent $PSScriptRoot
$DshHome    = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$ProfileDir = Join-Path $DshHome 'profiles\desktop'
$PkgPath    = Join-Path $ProfileDir 'package.json'
$BakPath    = "$PkgPath.bak-ths-ai"
$LinkPath   = Join-Path $ProfileDir "node_modules\$PluginId"
$DepSpec    = 'file:../../plugins/' + $PluginId

function Write-Step([string]$text) { Write-Host "  - $text" }
function Write-Head([string]$text) { Write-Host ''; Write-Host $text -ForegroundColor Cyan }

function Test-ReparsePoint([string]$path) {
  $item = Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue
  if (-not $item) { return $false }
  return [bool]($item.Attributes -band [IO.FileAttributes]::ReparsePoint)
}

if (-not (Test-Path -LiteralPath $PkgPath)) {
  throw "找不到 DSH profile: $PkgPath`n请先安装并至少启动一次 DSH 桌面端（或用 DSH_HOME 指定 .dsh 目录）。"
}

if ($Uninstall) {
  Write-Head "卸载 $PluginId"
  if (Test-Path -LiteralPath $BakPath) {
    if ($DryRun) { Write-Step "将恢复 $BakPath -> $PkgPath" }
    else { Copy-Item -LiteralPath $BakPath -Destination $PkgPath -Force; Write-Step "已恢复 $PkgPath" }
  } else {
    Write-Step "没有备份文件，跳过恢复（$BakPath）"
  }

  if (Test-Path -LiteralPath $LinkPath) {
    if (Test-ReparsePoint $LinkPath) {
      if ($DryRun) { Write-Step "将删除目录联接 $LinkPath" }
      else { cmd /c rmdir "$LinkPath" | Out-Null; Write-Step "已删除目录联接 $LinkPath" }
    } else {
      Write-Warning "$LinkPath 不是目录联接，已跳过（请手动检查）"
    }
  } else {
    Write-Step "目录联接不存在，跳过"
  }

  Write-Head '完成。请完全退出并重启 DSH 桌面端。'
  exit 0
}

Write-Head "安装 $PluginId -> DSH 桌面端"

if (-not (Test-Path -LiteralPath (Join-Path $PluginDir 'node_modules\playwright-core'))) {
  Write-Warning '未发现 playwright-core：请先在插件目录执行  npm install --omit=dev'
}

$pkg = Get-Content -LiteralPath $PkgPath -Raw | ConvertFrom-Json

if (-not $pkg.PSObject.Properties['dependencies'] -or $null -eq $pkg.dependencies) {
  $pkg | Add-Member -NotePropertyName dependencies -NotePropertyValue ([pscustomobject]@{}) -Force
}
$pkg.dependencies | Add-Member -NotePropertyName $PluginId -NotePropertyValue $DepSpec -Force

if (-not $pkg.PSObject.Properties['dsh'] -or $null -eq $pkg.dsh) {
  $pkg | Add-Member -NotePropertyName dsh -NotePropertyValue ([pscustomobject]@{}) -Force
}
if (-not $pkg.dsh.PSObject.Properties['profile'] -or $null -eq $pkg.dsh.profile) {
  $pkg.dsh | Add-Member -NotePropertyName profile -NotePropertyValue ([pscustomobject]@{}) -Force
}
$bundles = @()
if ($pkg.dsh.profile.PSObject.Properties['bundles'] -and $pkg.dsh.profile.bundles) {
  $bundles = @($pkg.dsh.profile.bundles)
}
if ($bundles -notcontains $PluginId) { $bundles += $PluginId }
$pkg.dsh.profile | Add-Member -NotePropertyName bundles -NotePropertyValue @($bundles) -Force

if ($DryRun) {
  Write-Step "将备份 $PkgPath -> $BakPath"
  Write-Step "将写入 dependencies['$PluginId'] = '$DepSpec'"
  Write-Step "将把 '$PluginId' 加入 dsh.profile.bundles（结果共 $($bundles.Count) 项）"
  Write-Step "将建立目录联接 $LinkPath -> $PluginDir"
  Write-Head 'DryRun：未写入任何文件。'
  exit 0
}

if (-not (Test-Path -LiteralPath $BakPath)) {
  Copy-Item -LiteralPath $PkgPath -Destination $BakPath -Force
}
$json = $pkg | ConvertTo-Json -Depth 100
[IO.File]::WriteAllText($PkgPath, $json, (New-Object Text.UTF8Encoding($false)))
Write-Step "已更新 $PkgPath（备份：$BakPath）"

$target = (Resolve-Path -LiteralPath $PluginDir).Path
$nodeModules = Split-Path -Parent $LinkPath
if (-not (Test-Path -LiteralPath $nodeModules)) {
  New-Item -ItemType Directory -Path $nodeModules -Force | Out-Null
}

if (Test-Path -LiteralPath $LinkPath) {
  if (Test-ReparsePoint $LinkPath) {
    cmd /c rmdir "$LinkPath" | Out-Null
  } else {
    throw "$LinkPath 已存在且不是目录联接。请先手动移走它，再重新运行本脚本。"
  }
}
New-Item -ItemType Junction -Path $LinkPath -Target $target | Out-Null
Write-Step "已建立目录联接 $LinkPath -> $target"

Write-Head '完成。请【完全退出】并重启 DSH 桌面端，然后打开右侧「同花顺 AI」面板。'
Write-Host '  回滚：powershell -ExecutionPolicy Bypass -File install\install.ps1 -Uninstall'
