---
summary: "Local setup from source: install, run Gateway, Control UI, and third-party model"
read_when:
  - Running OpenClaw from a repo checkout (not npm global)
  - Setting up Control UI + one LLM without channels
title: "Setup from source (minimal)"
---

# Setup from source (minimal)

This page records the steps and issues for a minimal local run: clone → build → Gateway + Control UI + one third-party model (no channels, no daemon).

## Prerequisites

- **Node 22+** (nvm/fnm is fine: `nvm use 22`)
- **pnpm** (project uses pnpm)

## Steps

### 1. Clone and install

```bash
cd /path/to/openclaw
pnpm install
pnpm build
```

If you hit permission or sandbox errors during `pnpm install`, run with full permissions or from a normal terminal.

### 2. Build Control UI

Control UI is served from `dist/control-ui`. Build it once:

```bash
pnpm ui:build
```

### 3. Start the Gateway

```bash
pnpm openclaw gateway run --allow-unconfigured
```

Or via the entry script (do **not** use `node dist/cli.js` — that file does not exist):

```bash
node openclaw.mjs gateway run --allow-unconfigured
```

**Note:** If you run this inside an IDE/sandbox (e.g. Cursor), you may see:

```text
SystemError [ERR_SYSTEM_ERROR]: uv_interface_addresses returned Unknown system error 1
```

Start the Gateway from a **normal terminal** on the host instead.

### 4. Open Control UI

- URL: **http://127.0.0.1:18789/**
- If the UI shows "Control UI assets not found", run `pnpm ui:build` and restart the Gateway.

### 5. Authentication (optional for local only)

If the UI shows **"unauthorized: gateway token missing"**, either:

- **Option A:** Run the onboarding wizard and use the generated token in Control UI settings, or
- **Option B (dev only):** Disable auth by editing `~/.openclaw/openclaw.json`:

```json
{
  "gateway": {
    "mode": "local",
    "auth": { "mode": "none" }
  }
}
```

Restart the Gateway after changing config.

### 6. Configure a third-party (OpenAI-compatible) model

To use a custom endpoint (e.g. 智谱 GLM, not ChatGPT), add `models.providers` and set the default model in `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "zhipu/GLM-4.7" }
    }
  },
  "models": {
    "mode": "merge",
    "providers": {
      "zhipu": {
        "baseUrl": "https://open.bigmodel.cn/api/coding/paas/v4",
        "apiKey": "YOUR_API_KEY",
        "api": "openai-completions",
        "models": [
          {
            "id": "GLM-4.7",
            "name": "GLM-4.7",
            "reasoning": false,
            "input": ["text"],
            "cost": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0 },
            "contextWindow": 128000,
            "maxTokens": 16384
          }
        ]
      }
    }
  }
}
```

Replace `baseUrl`, `apiKey`, and `models[].id` with your provider’s values. Restart the Gateway after config changes.

### 7. Port already in use

If you see **"Port 18789 is already in use"**:

```bash
lsof -i :18789
kill <PID>
```

Then start the Gateway again.

## Summary

| Step              | Command / action                                           |
| ----------------- | ---------------------------------------------------------- |
| Install + build   | `pnpm install && pnpm build`                               |
| Control UI assets | `pnpm ui:build`                                            |
| Start Gateway     | `pnpm openclaw gateway run --allow-unconfigured`           |
| Open UI           | http://127.0.0.1:18789/                                    |
| No auth (dev)     | `gateway.auth.mode: "none"` in `~/.openclaw/openclaw.json` |
| Third-party model | `models.providers.<id>` with `baseUrl`, `apiKey`, `models` |
| Free port         | `kill` the process using 18789                             |

## Troubleshooting

- **Gateway fails in IDE/sandbox:** Start it from a normal system terminal.
- **Control UI "assets not found":** Run `pnpm ui:build` and restart Gateway.
- **"gateway token missing":** Configure token in UI settings or set `gateway.auth.mode: "none"` for local dev.
- **Wrong entry point:** Use `pnpm openclaw` or `node openclaw.mjs`; there is no `dist/cli.js`.
- **Slow or no reply:** Check Gateway logs; confirm `baseUrl` and model id match your provider’s API (e.g. chat vs coding endpoint).
