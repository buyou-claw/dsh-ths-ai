# AGENTS.md

给在这个仓库里工作的 AI agent（以及人类贡献者）的项目约定。

## 项目定位（先读这段）

`dsh-ths-ai` 是 DeepSeek Harness 的**第三方**插件，通过本机已登录的浏览器 profile 访问同花顺问财。它不是官方项目，不接 API/MCP，不做反检测伪装。改动前请先读：

1. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) —— 三条链路与工具注册契约；
2. [docs/LEGAL.md](docs/LEGAL.md) —— 合规边界（**不能**引入隐身参数、代理池、并发采集）；
3. [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) —— 用户报障的排查树。

## 硬性约束

- **不要**把 `profile/`、`node_modules/`、`*.log` 提交进仓库（`.gitignore` 已覆盖；`profile/` 含登录 Cookie）。
- **不要**在日志、测试、issue 里写明文 Cookie / 手机号 / 验证码。
- **不要**引入新的网络依赖（不新增 API 客户端、不加代理、不加打码服务）。
- 每个 agent 工具必须声明 `output: { schema, render }`（DSH 0.2.x 契约），并**逐个注册**。
- 改动问财页面解析（`query.mjs`）时，必须在本地跑一次真实回归：`npm run verify:query`（需要已登录的 profile），并在 PR 里贴脱敏后的 `THS_RESULT` 摘要。
- 提交前必跑：`npm run check`。

## 代码结构约定

| 文件 | 职责 |
|---|---|
| `index.js` | 宿主侧：路由、工具、子进程桥、状态缓存、节流 |
| `client.js` | 右侧面板（无构建步骤，直接 `window.__ModuleLoader__` 注册） |
| `config.mjs` | **唯一**运行期配置入口，新增环境变量加在这里 |
| `*.mjs`（login/query/status） | 一次性子进程；只通过 stdout 标记行回传 JSON |
| `skills/ths/SKILL.md` | `/ths` 的模型侧行为指令 |

新增配置项：加进 `config.mjs` + README 配置表 + CHANGELOG。默认值必须保持既有行为不变。

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues in `buyou-claw/dsh-ths-ai`, operated with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map 1:1 to `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo: a root `GLOSSARY.md` and `docs/adr/` when they exist; currently neither exists yet, proceed without them. See `docs/agents/domain.md`.
