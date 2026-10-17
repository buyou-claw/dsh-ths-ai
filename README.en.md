# dsh-ths-ai · Tonghuashun Wencai plugin for DeepSeek Harness

[![CI](https://github.com/buyou-claw/dsh-ths-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/buyou-claw/dsh-ths-ai/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Bring **Tonghuashun Wencai (iwencai)** into DeepSeek Harness (DSH): a right-side panel, a `/ths` slash command, and two agent tools — `ths_query` and `ths_status`.

> **No API, no MCP.** The plugin reuses the browser profile you already logged into on this machine, opens the Wencai page, and reads the result table — exactly like you would.
> That means no API key, no server, no data leaving your computer — but your account, your session and the terms of service are your responsibility. **Read [LEGAL.md](docs/LEGAL.md) (Chinese) before use.**

![panel](docs/assets/panel.png)

## What it does

| Capability | Notes |
|---|---|
| Sidebar panel | Natural-language question → Wencai table; login status, one-click login, refresh |
| `/ths <question>` | The model queries Wencai and answers with conclusion + compact table + caveats |
| `ths_query` tool | `{"query": "top gainers in the last week"}` |
| `ths_status` tool | Read-only login-status probe |
| Status cache | The probe launches a browser (10–20 s), so results are cached for 5 min and warmed up at startup |
| Throttling | Minimum 3 s between queries by default |

## Requirements

- DSH `>= 0.2.0-rc.2` (0.2.x requires tools to declare `output { schema, render }`)
- Node.js `>= 20` (the runtime bundled with DSH is fine)
- Microsoft Edge installed (Playwright `channel: 'msedge'`; no browser download)
- Your own Wencai account
- **Windows is the tested platform.** On macOS/Linux set `DSH_THS_BROWSER=chrome` or `chromium` (untested).

## Install

```powershell
git clone https://github.com/buyou-claw/dsh-ths-ai "$env:USERPROFILE\.dsh\plugins\dsh-ths-ai"
cd "$env:USERPROFILE\.dsh\plugins\dsh-ths-ai"
npm install --omit=dev
powershell -ExecutionPolicy Bypass -File install\install.ps1
# then restart DSH
```

Manual installation on any platform: [docs/INSTALL.md](docs/INSTALL.md).

## First run

1. Open the **同花顺 AI** panel → **登录问财** (login);
2. Complete the login in the popup browser window;
3. **Close that window** — the session is now stored in the local `profile/`;
4. Back in the panel, hit **刷新状态** (refresh status).

> A browser profile can only be used by one browser process at a time — do not query while the login window is open.

## Configuration (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `DSH_THS_PROFILE_DIR` | `<plugin>/profile` | Browser profile directory (must be writable) |
| `DSH_THS_BROWSER` | `msedge` | Playwright channel (`chrome` / `chromium` elsewhere) |
| `DSH_THS_WAIT_MS` | `12000` | Result-page render wait |
| `DSH_THS_STATUS_WAIT_MS` | `3500` | Status-page wait |
| `DSH_THS_MIN_INTERVAL_MS` | `3000` | Minimum interval between queries |
| `DSH_THS_LOG_DIR` | `~/.dsh/logs` | Diagnostic log directory |
| `DSH_THS_NODE` | auto | Node executable used for child processes |

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) (Chinese). Most common: tools missing from the model means DSH was not restarted or is older than `0.2.0-rc.2`.

## Privacy & security

Cookies (including `u_ukey`) stay in the local `profile/` directory and are never uploaded. Delete `profile/` to log out completely. See [SECURITY.md](SECURITY.md).

## License

MIT. This project is **not affiliated with** Zhejiang Hexin Tonghuashun Network Information Co., Ltd. Trademarks belong to their respective owners and are used descriptively only.
