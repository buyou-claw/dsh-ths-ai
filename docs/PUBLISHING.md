# 发布与分发说明

本仓库是 **DSH 第三方插件**，目前有两类分发通道：GitHub 直装（已就绪）与 DSH 插件市场（待提交）。本文说明两者的要求与步骤。

## 1. 当前发布物

| 产物 | 位置 | 状态 |
|---|---|---|
| 源码仓库 | <https://github.com/buyou-claw/dsh-ths-ai> | ✅ 公开，MIT |
| npm 包（可 `npm pack`） | GitHub Releases / 后续 npm | ✅ 本地 `npm pack` 校验通过（24 个文件，不含 profile/node_modules/日志） |
| Release | <https://github.com/buyou-claw/dsh-ths-ai/releases/tag/v0.1.0> | ✅ |
| Git tag | `v0.1.0` | ✅ |
| CI | `.github/workflows/ci.yml` | ✅ 语法检查 + 打包 + 合规守卫（禁止提交 profile/日志/反检测代码） |

## 2. 插件元数据（DSH 读取的部分）

`package.json` 的 `dsh` 字段是插件被 DSH / 市场识别的入口：

```json
"dsh": {
  "id": "dsh-ths-ai",
  "name": "同花顺 AI",
  "version": "0.1.0",
  "repo": "buyou-claw/dsh-ths-ai",
  "platform": "win32",
  "permissions": "子进程(node + 浏览器)、本机浏览器 profile 读写、webServer 路由 /ths-ai/*、agent 工具 2 个、skill 1 个、右侧面板 1 个",
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": { "inject": [], "platform": "web" }
}
```

提交市场前请确认：

- [ ] `id` 唯一且与仓库/目录名一致（`dsh-ths-ai`）
- [ ] `version` 与 `CHANGELOG.md` 的最新段、Git tag 一致（语义化版本）
- [ ] `repo` 指向公开可访问的 GitHub 仓库
- [ ] `permissions` 如实描述（本插件需要子进程与浏览器，这是审核重点）
- [ ] `platform` 与实际支持范围一致（当前 `win32`，如实标注而不是宣称跨平台）
- [ ] `files` 白名单不含 `profile/`（否则会打包登录 Cookie —— 这是**安全事故**，CI 已守卫）

## 3. 提交到 DSH 插件市场（dshmarket）

市场收录方式随 DSH 版本可能变化，当前做法：

1. 在本地 DSH 打开「插件」/ dshmarket，确认市场是否提供「提交插件 / Submit plugin」入口；
2. 一般需要提供：仓库 URL、插件 id、名称、简介、平台、所需权限、截图（`docs/assets/panel.png` 可直接用）、许可证；
3. 若市场采用中心化清单（registry repo），按其 CONTRIBUTING 提 PR，清单条目建议：

```yaml
- id: dsh-ths-ai
  name: 同花顺 AI
  repo: https://github.com/buyou-claw/dsh-ths-ai
  version: 0.1.0
  license: MIT
  platform: [win32]
  permissions: [subprocess, browser-profile, web-route, agent-tools, skill, client-panel]
  description: >
    用本机已登录浏览器 profile 查询同花顺问财，提供右侧面板、/ths skill 与 ths_query/ths_status 工具。
    非官方，不使用 API/MCP，不采集数据。
  screenshots: [docs/assets/panel.png]
```

> **注意**：市场审核通常关心「是否会批量抓取站点 / 是否绕过登录」。本项目的回答是明确的：单用户、手动触发、默认 3 秒节流、无隐身参数、无代理池。提交材料里要写清楚，见 [LEGAL.md](LEGAL.md)。

## 4. 发布新版本 checklist

1. 更新 `package.json` 的 `version` 与 `dsh.version`；
2. 更新 `CHANGELOG.md`（新增 `## [x.y.z]`，写清 Added / Fixed / Changed / Known limitations）；
3. `npm run check` + 本地真实回归（`npm run verify:status`、`THS_QUERY=... npm run verify:query`）；
4. 提交并推送 `main`；
5. `git tag -a vX.Y.Z -m "..."` + `git push origin vX.Y.Z`；
6. `gh release create vX.Y.Z --title "..." --notes-file <notes>`；
7. 若已在市场收录：按市场流程更新版本与说明。

## 5. 版本兼容矩阵

| 插件版本 | DSH 版本 | 说明 |
|---|---|---|
| 0.1.x | `>= 0.2.0-rc.2` | 必须声明 `output { schema, render }`；旧版 DSH 允许无 `output`，但本插件的注册代码按新契约写 |

破坏性变更（如 DSH 修改工具注册契约）时，用 `peerDependencies` 的版本区间 + CHANGELOG 明确标注，不要静默兼容。
