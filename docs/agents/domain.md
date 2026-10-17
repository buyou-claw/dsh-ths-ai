# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root, or
- **`GLOSSARY-MAP.md`** at the repo root if it exists: it points at one `GLOSSARY.md` per context. Read each one relevant to the topic.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terms or decisions actually get resolved.

本仓库当前为**单上下文（single-context）**：`GLOSSARY.md` 与 `docs/adr/` 尚未创建，属正常状态。

## File structure

Single-context repo (this repo):

```
/
├── GLOSSARY.md          ← 需要时再由 /domain-modeling 创建
├── docs/adr/            ← 需要时再创建
├── index.js
├── client.js
└── docs/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md` — once it exists. Don't drift to synonyms.

本仓库已稳定的核心术语（新增概念请进 GLOSSARY）：

- **profile（持久化浏览器配置目录）**：Playwright persistent context 的数据目录，登录 Cookie 存在这里；
- **tool registration（工具注册）**：DSH 启动时把 agent 工具注入模型工具表的一次性动作；与 HTTP 路由链路无关；
- **status cache（状态缓存）**：为了不每次都拉起浏览器而做的登录态短缓存；
- **enqueue（串行队列）**：同一 profile 只能被一个浏览器进程使用，所有浏览器操作串行执行；
- **THS_RESULT / THS_STATUS**：子进程 stdout 上的 JSON 标记行。

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007, but worth reopening because…_
