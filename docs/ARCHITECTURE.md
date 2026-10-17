# 架构说明

一句话：**DSH 插件壳（宿主 + 面板 + skill + 2 个工具）包着 3 个一次性浏览器子进程**，用你本机的登录态读取问财页面文本。

## 1. 组件与链路

```text
┌──────────────────────── DSH 桌面端 ────────────────────────┐
│                                                            │
│  client.js  右侧面板「同花顺 AI」                            │
│      │  fetch /ths-ai/{status,login,query}                  │
│      ▼                                                     │
│  index.js   宿主侧（cordis 插件）                            │
│      ├─ webServer 路由 /ths-ai/*                            │
│      ├─ agent 工具 ths_query / ths_status                    │
│      ├─ skill 「/ths」                                       │
│      ├─ 状态缓存 + 串行队列 enqueue()                        │
│      └─ 子进程桥 runNode()                                   │
│             │ spawn(node query.mjs | status.mjs | login.mjs) │
│             ▼                                              │
│  Playwright(chromium) → 本机 Edge → www.iwencai.com         │
│             │ 读取页面表格文本                               │
│             ▼                                              │
│  子进程 stdout 打印 THS_RESULT:<json> / THS_STATUS:<json>    │
│             │ index.js 用 extractMarked() 取出 JSON          │
│             ▼                                              │
│  面板渲染表格 / 模型拿到 Markdown                             │
└────────────────────────────────────────────────────────────┘
```

三条**互不依赖**的入口：

| 入口 | 走什么 | 失败时表现 |
|---|---|---|
| 面板查询 | HTTP 路由 `/ths-ai/query` → `query.mjs` | 面板显示错误，工具不受影响 |
| `/ths` 与 `ths_query` | agent 工具 → `runQuery()` → `query.mjs` | 模型收到错误文本，面板不受影响 |
| 登录状态 | `/ths-ai/status` → `status.mjs`（或缓存） | 面板显示「未知」，不影响查询 |

**这条区分很重要**：「面板能用但模型没工具」不是同一个 bug —— 前者是 HTTP 路由，后者是 DSH 启动时的一次性工具注册。

## 2. 为什么用子进程而不是在主进程里跑 Playwright

- 浏览器崩溃/超时不会带崩 DSH 宿主；
- 每次操作拿到干净的浏览器生命周期，profile 独占问题更容易串行化；
- 宿主只需要认 stdout 上的一个标记行（`THS_STATUS:` / `THS_RESULT:`），契约极简。

代价：每次操作多付一次 node 进程启动（约 1–1.5 s），以及必须用 `enqueue()` 串行化（同一个持久化 profile 不能被两个浏览器进程同时打开）。

## 3. 工具注册契约（DSH 0.2.x）

DSH 0.2.x 起，`tools.register()` 要求：

```js
{
  name: 'ths_query',
  description: '...',
  parameters: { /* JSON Schema */ },
  output: { schema: { type: 'object', additionalProperties: true }, render: (args, value) => [{ type: 'text', text }] },
  async execute(args) { return { markdown: '...' }; }
}
```

缺少 `output` 会抛 `TypeError: tool "ths_query" must declare output { schema, render, presentationMeta? }`。

因为注册发生在插件 `apply()` 里，异常必须自己捕获并**逐个工具注册**，否则一个失败会把另一个也带走 —— 0.1.0 已修。

## 4. 状态缓存

`status.mjs` 每次都要拉起浏览器（10–20 s），太贵。策略：

- 成功结果缓存 **5 分钟**，失败缓存 **30 秒**；
- 同一时刻只允许一个检查在飞（`statusInflight` 去重）；
- 插件启动 **4 秒后**后台预热一次；
- 面板打开走缓存立即返回；「刷新状态」带 `?fresh=1` 强制真检查；
- 查询成功后顺带把「已登录」写进缓存。

## 5. 查询结果形状

`query.mjs` 输出：

```json
{
  "ok": true,
  "needLogin": false,
  "blocked": false,
  "hasTable": true,
  "title": "同花顺问财",
  "url": "...",
  "tables": [[["序号","","股票代码","股票简称","现价(元)","涨跌幅(%)","区间涨跌幅(%)"], ["1","","301569","联亚药业","25.17","-28.33","259.57"]]],
  "text": "页面正文前 12000 字",
  "query": "…",
  "elapsedMs": 13282
}
```

宿主侧的 `formatResult()` 取第一个有效表格渲染成 Markdown（最多 21 行），否则退化为页面正文摘要。

## 6. 配置层

`config.mjs` 是唯一的配置入口，被宿主与 3 个子进程共同引用：

- `PROFILE_DIR`：持久化 profile 路径（可被 `DSH_THS_PROFILE_DIR` 覆盖）；
- `BROWSER_CHANNEL`：Playwright channel（默认 `msedge`）；
- `QUERY_WAIT_MS` / `STATUS_WAIT_MS`：固定等待（问财是前端渲染，等选择器比等时间更准但更脆，当前先求稳）；
- `MIN_QUERY_INTERVAL_MS`：节流；
- `logLine()`：诊断日志，失败绝不抛（安装目录可能只读）。

## 7. 已知设计取舍

| 取舍 | 现状 | 原因 |
|---|---|---|
| 固定等待 12 s | 慢但稳 | 问财表格是异步渲染，选择器随改版变化 |
| 不缓存查询结果 | 每次真实访问 | 行情数据时效性强，缓存会误导 |
| 串行执行 | 并发能力为 0 | 持久化 profile 独占 |
| Windows 默认 | `msedge` | 作者实测路径；其它平台靠环境变量 |
| 只读 DOM 文本 | 不注入脚本、不拦截请求 | 减少对目标站点的侵入 |
