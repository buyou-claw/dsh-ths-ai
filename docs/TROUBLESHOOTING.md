# 故障排查

排查顺序：**先看日志 → 再看 DSH 版本 → 再看浏览器/profile → 最后看问财页面**。

```powershell
# 日志（所有关键事件都在这）
Get-Content "$env:USERPROFILE\.dsh\logs\dsh-ths-ai.log" -Tail 50
```

日志里出现 `registered` 说明工具已注册；`registration failed` 说明注册失败；`query failed` / `status check failed` 说明浏览器侧问题。

---

## 1. 模型说没有 `ths_query` 工具

| 检查 | 命令/位置 | 期望 |
|---|---|---|
| DSH 版本 | 「关于」或 profile `package.json` | `>= 0.2.0-rc.2` |
| 是否真的重启 | 完全退出再启动 | — |
| 注册结果 | `~/.dsh/logs/dsh-ths-ai.log` | `ths_query registered` |
| bundle 是否登记 | `~/.dsh/profiles/desktop/package.json` → `dsh.profile.bundles` | 含 `dsh-ths-ai` |
| 联接是否在 | `~/.dsh/profiles/desktop/node_modules/dsh-ths-ai` | 存在且指向插件目录 |

若日志是：

```
ths_query registration failed: TypeError: tool "ths_query" must declare output { schema, render, presentationMeta? }
```

说明 DSH 版本与插件契约不匹配 —— 升级 DSH 或使用声明了 `output` 的插件版本（0.1.0 已声明）。

**注意：面板能用 ≠ 工具已注册。** 面板走 HTTP 路由，工具走启动时的一次性注册，两条链路互不影响。

---

## 2. 登录状态一直「检查中…」或很慢

- **首次**检查必须真正拉起浏览器并访问问财，10–20 秒属正常；结果会缓存 5 分钟，并在 DSH 启动 4 秒后后台预热。
- 想强制重查：点「刷新状态」（会带 `?fresh=1`）。
- 一直不结束：看日志 `status check failed`，常见是 Edge 未安装、profile 被占用、网络不通。

---

## 3. 明明登录过，却提示未登录

1. 登录用的窗口和查询用的浏览器必须是**同一个 profile 目录**（默认都是 `<插件目录>/profile`）；
2. 登录完成后**必须关闭登录窗口**，让 Cookie 落盘；
3. 回面板点「刷新状态」；
4. 若把 `DSH_THS_PROFILE_DIR` 改过，登录时也要用同一个值（同一台机器建议别改）。

---

## 4. `Target page, context or browser has been closed` / profile 被占用

原因：Playwright 的持久化 profile **同时只能被一个浏览器进程使用**。

- 登录窗口开着时不要查询；
- 不要在同一 profile 上并发查询；
- 前一个进程异常退出可能留下锁：确认没有残留 `msedge.exe` 进程后再试：

```powershell
Get-Process msedge -ErrorAction SilentlyContinue | Select-Object Id, StartTime
```

---

## 5. 查询返回 `blocked: true` /「访问受限」

问财的风控或限流被触发了。

- 调大间隔：`setx DSH_THS_MIN_INTERVAL_MS 10000`，重启 DSH；
- 停一段时间再用；
- **不要**通过提高频率、换 IP、模拟设备指纹等方式绕过 —— 这既违反本项目定位，也违反站点协议。

---

## 6. 抓到了表格，但列是空的 / 顺序乱了

问财前端改版。请：

1. 用同一问句在浏览器里手动打开，确认页面结构是否变化；
2. 开 issue，附：DSH 版本、`DSH_THS_WAIT_MS` 值、`~/.dsh/logs/dsh-ths-ai.log` 片段、问句；
3. 临时缓解：调大 `DSH_THS_WAIT_MS`（例如 20000），让页面渲染更充分。

---

## 7. macOS / Linux 启动浏览器失败

默认 channel 是 `msedge`（Windows 实测路径）。其它平台：

```bash
export DSH_THS_BROWSER=chrome     # 或 chromium
cd ~/.dsh/plugins/dsh-ths-ai
npm run verify:status             # 先单独验证浏览器能起来
```

注意：`playwright-core` 不带浏览器内核，需本机已安装 Chrome/Chromium。非 Windows 平台未实测，属已知限制。

---

## 8. 想从零重置

```powershell
# 1. 退出 DSH
# 2. 删除登录态（下次重新登录）
Remove-Item -Recurse -Force "$env:USERPROFILE\.dsh\plugins\dsh-ths-ai\profile"
# 3. 删日志
Remove-Item "$env:USERPROFILE\.dsh\logs\dsh-ths-ai.log" -ErrorAction SilentlyContinue
# 4. 启动 DSH，重新登录
```

---

## 9. 提 issue 的最小信息集

- DSH 版本、操作系统版本
- 复现步骤与问句
- `~/.dsh/logs/dsh-ths-ai.log` 相关片段
- 面板上显示的状态（已登录/未登录/未知）

**不要**贴 Cookie、账号、手机号、验证码或完整 profile 目录内容。
