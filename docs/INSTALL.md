# 安装、升级与卸载

> 目标读者：第一次在本机安装 `dsh-ths-ai` 的人。全程不需要 API Key，只需要本机装有 Edge 和 DSH 桌面端。

## 0. 先确认环境

```powershell
# DSH 版本（需要 >= 0.2.0-rc.2）
node -v                       # 需要 >= 20（DSH 自带运行时即可）
Test-Path "$env:USERPROFILE\.dsh\profiles\desktop"      # 应为 True
Get-Item "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" -ErrorAction SilentlyContinue
```

- DSH 版本在桌面端「关于」里能看到；也可以看 `~/.dsh/profiles/desktop/package.json` 里 `@deepseek-ai/dsh` 的版本。
- 没装 Edge：先装 Edge（插件默认用系统 Edge，不下载浏览器内核）。

## 1. 放到 DSH 插件目录

DSH 只会从 `~/.dsh/plugins/<id>` 和 profile 的 `node_modules` 解析插件，**不要**把仓库放在桌面或临时目录。

```powershell
git clone https://github.com/buyou-claw/dsh-ths-ai "$env:USERPROFILE\.dsh\plugins\dsh-ths-ai"
cd "$env:USERPROFILE\.dsh\plugins\dsh-ths-ai"
npm install --omit=dev
```

> 已经手动下载 zip？解压后确认目录名是 `dsh-ths-ai`、里面直接就是 `index.js`（不要多套一层）。

## 2. 接进 DSH 桌面端 profile

### 2.1 一键脚本（Windows）

```powershell
powershell -ExecutionPolicy Bypass -File install\install.ps1
```

脚本会：

1. 备份 `~/.dsh/profiles/desktop/package.json` 为 `package.json.bak-ths-ai`；
2. 在 `dependencies` 写入 `"dsh-ths-ai": "file:../../plugins/dsh-ths-ai"`；
3. 在 `dsh.profile.bundles` 追加 `"dsh-ths-ai"`；
4. 在 profile 的 `node_modules` 下建目录联接（已存在则跳过）。

可重复运行；参数 `-DryRun` 只打印将做什么。

### 2.2 手工（任何平台）

编辑 `~/.dsh/profiles/desktop/package.json`：

```json
{
  "dependencies": {
    "dsh-ths-ai": "file:../../plugins/dsh-ths-ai"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-ths-ai"
      ]
    }
  }
}
```

然后建联接：

```powershell
# Windows
New-Item -ItemType Junction `
  -Path "$env:USERPROFILE\.dsh\profiles\desktop\node_modules\dsh-ths-ai" `
  -Target "$env:USERPROFILE\.dsh\plugins\dsh-ths-ai"
```

```bash
# macOS / Linux
ln -s ~/.dsh/plugins/dsh-ths-ai ~/.dsh/profiles/desktop/node_modules/dsh-ths-ai
```

> 为什么需要联接：profile 的 `dependencies` 里有这条，但脚本刻意不跑 `npm install`（会重装整个 profile 依赖树），用联接等价且更快。

## 3. 重启 DSH 并验证

1. **完全退出** DSH 桌面端（托盘也要退），再启动；
2. 右侧栏出现「同花顺 AI」；
3. 打开 `~/.dsh/logs/dsh-ths-ai.log`，应看到：
   ```
   ... ths_query registered
   ... ths_status registered
   ```
4. 对话里发 `/ths 今日涨幅前10的股票`。

**若日志里是 `registration failed`**：把日志内容贴进 issue，先看 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)。

## 4. 升级

```powershell
cd "$env:USERPROFILE\.dsh\plugins\dsh-ths-ai"
git pull
npm install --omit=dev
# 重启 DSH
```

`profile/` 目录（登录态）不会被覆盖，升级后无需重新登录。

## 5. 卸载与回滚

```powershell
cd "$env:USERPROFILE\.dsh\plugins\dsh-ths-ai"
powershell -ExecutionPolicy Bypass -File install\install.ps1 -Uninstall
# 可选：连同仓库与登录态一起删
# Remove-Item -Recurse -Force "$env:USERPROFILE\.dsh\plugins\dsh-ths-ai"
```

`-Uninstall` 会恢复 `package.json.bak-ths-ai`、删除联接。老版本遗留的 `rollback.ps1` 也能做同样的事（只恢复 package.json）。

登录态：删除 `~/.dsh/plugins/dsh-ths-ai/profile/` 即彻底退出问财登录。

## 6. 装到只读位置（进阶）

如果插件被装进只读的 `node_modules`（例如全局安装），浏览器写 profile 会失败。用环境变量把 profile 指到可写目录：

```powershell
setx DSH_THS_PROFILE_DIR "$env:USERPROFILE\.dsh\ths-profile"
setx DSH_THS_LOG_DIR "$env:USERPROFILE\.dsh\logs"
# 重启 DSH
```

## 7. 常见安装问题速查

| 现象 | 处理 |
|---|---|
| 右侧没有面板 | 检查 profile `package.json` 的 `bundles` 是否含 `dsh-ths-ai`；是否建了联接；是否真的重启 |
| 面板在但工具缺失 | 看日志 `registration failed`；确认 DSH 版本 `>= 0.2.0-rc.2` |
| `Cannot find package 'playwright-core'` | 忘了在插件目录 `npm install --omit=dev` |
| `browserType.launchPersistentContext: Executable doesn't exist` | 本机没有 Edge；装 Edge，或设 `DSH_THS_BROWSER=chrome` |
| 登录后仍显示未登录 | 登录用的 profile 与查询用的不是同一个；统一 `DSH_THS_PROFILE_DIR` |
