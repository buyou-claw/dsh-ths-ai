## 这个 PR 做了什么

<!-- 一句话说明；关联 issue 请写 Closes #123 -->

## 为什么

<!-- 用户痛点 / 复现的问题 / 设计取舍 -->

## 影响面

- [ ] 宿主（`index.js`）
- [ ] 面板（`client.js`）
- [ ] 浏览器子进程（`login/query/status.mjs`）
- [ ] 配置（`config.mjs`）
- [ ] 技能/工具描述（`skills/ths/SKILL.md`）
- [ ] 仅文档

## 测试

- [ ] `npm run check` 通过
- [ ] 若改了浏览器/解析逻辑：本地跑过 `npm run verify:status`（结果：…）
- [ ] 若改了浏览器/解析逻辑：本地跑过 `npm run verify:query`（脱敏摘要：…）

## 合规自查（必须全勾）

- [ ] 没有引入反检测/隐身参数、代理池、验证码绕过
- [ ] 没有引入批量采集/并发调度
- [ ] 没有提交 `profile/`、`node_modules/`、日志文件
- [ ] 代码、日志、截图里没有 Cookie / 账号 / 手机号
- [ ] 若新增配置项：默认值保持既有行为不变，并已更新 README 配置表与 CHANGELOG

## 备注

<!-- 已知限制、后续计划、需要 reviewer 特别关注的点 -->
