# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-10-17

首个公开发布版本。功能与作者本机实测版本一致，只做了三处不改变主路径的收敛，并补齐开源工程化设施。

### Added

- 右侧「同花顺 AI」面板：查询、登录、状态刷新、表格渲染。
- `/ths <问题>` skill 与 `ths_query` / `ths_status` 两个 agent 工具。
- 运行期配置集中到 `config.mjs`：`DSH_THS_PROFILE_DIR`、`DSH_THS_BROWSER`、`DSH_THS_WAIT_MS`、`DSH_THS_STATUS_WAIT_MS`、`DSH_THS_MIN_INTERVAL_MS`、`DSH_THS_LOG_DIR`、`DSH_THS_NODE`。
- 登录态缓存（成功 5 分钟 / 失败 30 秒）+ 启动后台预热 + 「刷新状态」强制重查。
- 查询节流：默认两次查询间隔 ≥3 秒。
- 诊断日志改写到 `~/.dsh/logs/dsh-ths-ai.log`（超过 512 KB 自动清空），不再写入插件安装目录。
- 工程化：LICENSE(MIT)、.gitignore、CI（语法检查）、Issue/PR 模板、SECURITY、CONTRIBUTING、AGENTS.md、`docs/`（安装 / 排查 / 架构 / 合规）、一键安装与卸载脚本。

### Fixed

- **工具注册失败**：DSH 0.2.x 起 `tools.register()` 要求工具声明 `output { schema, render }`，缺失会抛 `TypeError: tool "ths_query" must declare output ...` 并被静默吞掉，表现为「面板和登录都正常，但模型没有工具」。现已为两个工具补齐 `output`。
- 两个工具改为**逐个注册**，单个失败不再阻塞另一个，并各自记录日志。
- 状态检查每次都会新起浏览器（10–20 s）——改为缓存 + 预热，面板打开基本秒回。

### Changed

- 移除 `--disable-blink-features=AutomationControlled` 反检测隐身参数（合规）：不再对目标站点做任何反检测伪装。
- `nodeExecutable()` 增加跨平台候选路径（不再只依赖 `USERPROFILE`）。

### Known limitations

- 仅 Windows + Edge 为实测路径；macOS/Linux 需手动指定 `DSH_THS_BROWSER`，未实测。
- 查询依赖固定等待（默认 12 s），比基于选择器的等待慢。
- 结果解析依赖问财页面结构，改版时可能失效。
