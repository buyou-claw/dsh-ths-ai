#!/usr/bin/env bash
# 把 dsh-ths-ai 接入 DSH 桌面端 profile（macOS / Linux，未实测，欢迎反馈）。
#
#   bash install/install.sh              # 安装
#   bash install/install.sh --dry-run    # 只打印
#   bash install/install.sh --uninstall  # 卸载
#
# 完成后完全退出并重启 DSH 桌面端。
set -euo pipefail

PLUGIN_ID="dsh-ths-ai"
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/desktop"
PKG="$PROFILE_DIR/package.json"
BAK="$PKG.bak-ths-ai"
LINK="$PROFILE_DIR/node_modules/$PLUGIN_ID"
DEP="file:../../plugins/$PLUGIN_ID"
MODE="${1:-install}"

command -v node >/dev/null 2>&1 || { echo "需要 node（>=20）"; exit 1; }
[ -f "$PKG" ] || { echo "找不到 DSH profile: $PKG（请先安装并启动一次 DSH）"; exit 1; }

if [ "$MODE" = "--uninstall" ]; then
  if [ -f "$BAK" ]; then cp -f "$BAK" "$PKG"; echo "已恢复 $PKG"; else echo "没有备份，跳过恢复"; fi
  if [ -L "$LINK" ]; then rm -f "$LINK"; echo "已删除符号链接 $LINK"; fi
  echo "完成。请完全退出并重启 DSH。"
  exit 0
fi

if [ "$MODE" = "--dry-run" ]; then
  echo "将备份 $PKG -> $BAK"
  echo "将写入 dependencies['$PLUGIN_ID'] = '$DEP'"
  echo "将把 '$PLUGIN_ID' 加入 dsh.profile.bundles"
  echo "将创建符号链接 $LINK -> $PLUGIN_DIR"
  exit 0
fi

[ -d "$PLUGIN_DIR/node_modules/playwright-core" ] || \
  echo "⚠ 未发现 playwright-core：请先在插件目录执行 npm install --omit=dev"

cp -f "$PKG" "$BAK" 2>/dev/null || true

node - "$PKG" "$PLUGIN_ID" "$DEP" <<'NODE'
const fs = require('fs');
const [, , pkgPath, id, spec] = process.argv;
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies[id] = spec;
pkg.dsh = pkg.dsh || {};
pkg.dsh.profile = pkg.dsh.profile || {};
const bundles = new Set(pkg.dsh.profile.bundles || []);
bundles.add(id);
pkg.dsh.profile.bundles = [...bundles];
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('已更新 ' + pkgPath);
NODE

mkdir -p "$(dirname "$LINK")"
if [ -L "$LINK" ]; then rm -f "$LINK"; fi
if [ -e "$LINK" ]; then echo "$LINK 已存在且不是符号链接，请手动移走后重试"; exit 1; fi
ln -s "$PLUGIN_DIR" "$LINK"
echo "已建立符号链接 $LINK -> $PLUGIN_DIR"

echo "完成。请完全退出并重启 DSH 桌面端。"
echo "卸载：bash install/install.sh --uninstall"
