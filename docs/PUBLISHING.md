# 发布与分发说明

本仓库是 **DSH 第三方插件**，目前有两类分发通道：GitHub 直装（已就绪）与 DSH 插件市场（已通过 `dsh-plugin` topic 收录）。本文说明两者的要求与步骤。

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

## 3. 市场收录：GitHub topic `dsh-plugin`

DSH 插件市场的收录方式就是**给仓库打上 `dsh-plugin` topic**（DSH 官方仓库 `deepseek-ai/deepseek-harness` 与生态里的头部插件都用这个标签），没有需要提 PR 的中心化清单。

本仓库当前 topics（已生效）：

```
dsh-plugin · dsh · deepseek-harness · iwencai · tonghuashun · a-share · playwright · stock-screener
```

验证方式（应能搜到自己）：

```bash
gh repo view --json repositoryTopics
# 或直接在 GitHub 搜索
#   topic:dsh-plugin user:buyou-claw
```

维护要点：

- **`dsh-plugin` 必须一直在**，它是市场识别插件的唯一约定；其余是检索用关键词，可随时增删；
- `dsh` / `deepseek-harness` 用来进生态聚合列表；
- 领域词（`iwencai`、`tonghuashun`、`a-share`、`stock-screener`）决定被搜到的场景；
- topic 不能带中文（GitHub 限制），所以中文关键词写进 `description` 与 README。

> 说明：市场只负责「发现」，安装仍走本仓库的 `install/install.ps1` 或手工步骤。因此发布新版本时**不需要**重新打标，只要 tag + release 即可。

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
