# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

## 额外标签（本仓库特有）

| 标签 | 用途 |
|---|---|
| `area:tool-registration` | DSH 工具注册 / `output` 契约相关 |
| `area:browser` | Playwright / profile / 登录态相关 |
| `area:parsing` | 问财页面解析 / 表格抽取失效 |
| `compliance` | 合规、隐私、协议相关 |
| `good first issue` | 适合新贡献者 |

编辑本文件时同步在 GitHub 上创建/改名对应 label（`gh label create <name> --description "..." --color <hex>`）。
