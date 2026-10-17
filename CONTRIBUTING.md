# 贡献指南

感谢你愿意参与。这个仓库很小，但有几条不能破的约定。

## 先读

1. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) —— 三条链路、`output` 契约、状态缓存；
2. [docs/LEGAL.md](docs/LEGAL.md) —— 合规边界；
3. [AGENTS.md](AGENTS.md) —— 硬性约束清单。

## 开发环境

```bash
git clone https://github.com/buyou-claw/dsh-ths-ai
cd dsh-ths-ai
npm install --omit=dev
npm run check
```

真实回归（需要本机已登录的 profile）：

```bash
npm run verify:status
# Windows PowerShell:  $env:THS_QUERY="今日涨幅前10的股票"; npm run verify:query
# bash:                THS_QUERY="今日涨幅前10的股票" npm run verify:query
```

## 代码风格

- 纯 ESM（`index.js` / `*.mjs`），**没有构建步骤**；`client.js` 是直接在浏览器里执行的传统脚本，保持无依赖。
- 不引入新的运行期依赖，尤其是网络库、HTTP 客户端、代理、打码、指纹伪装类库。
- 新增配置项：只有 `config.mjs` 一个入口；默认值必须保持现有行为不变；同步更新 README 配置表 + CHANGELOG。
- 新增 agent 工具：必须声明 `output: { schema, render }`，并且**逐个注册**（失败互不影响）。

## 提交 PR 前

- [ ] `npm run check` 通过（CI 也会跑）
- [ ] 改动浏览器/解析逻辑时，本地跑过 `verify:status` + `verify:query`，并在 PR 里贴**脱敏**后的结果摘要
- [ ] 更新了 `CHANGELOG.md` 的 `Unreleased` 段
- [ ] 没有提交 `profile/`、`node_modules/`、`*.log`
- [ ] 没有把任何 Cookie / 账号信息写进代码、日志、测试、截图
- [ ] 遵守 [docs/LEGAL.md](docs/LEGAL.md)：没有引入反检测、并发采集、代理池、验证码绕过

## 提交信息

用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/)：

```
fix(tools): 补齐 output 声明，修复 DSH 0.2.x 下工具注册失败
feat(panel): 状态检查改为缓存 + 预热
docs(legal): 明确反检测边界
chore(ci): 增加 profile 未入库检查
```

## 报告 Bug

用 issue 模板，并附上：

- DSH 版本、操作系统
- 复现步骤与问句
- `~/.dsh/logs/dsh-ths-ai.log` 片段（脱敏）
- 面板状态

**不要贴 Cookie、账号、手机号、验证码。**

## 行为准则

- 不讨论、不索取、不交换任何行情数据或账号；
- 不在本仓库讨论"如何绕过风控/反爬/付费墙"—— 此类 PR/issue 会被直接关闭；
- 对事不对人，技术讨论保持克制。
